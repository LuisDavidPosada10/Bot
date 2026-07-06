import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import { OPENAI_MODEL, OPENAI_API_KEY, OPENAI_BASE_URL, HISTORY_MAX_TURNS, HISTORY_MAX_TOKENS, HISTORY_MAX_TURNS_PORTFOLIO, HISTORY_MAX_TOKENS_PORTFOLIO } from '../config/env.js';
import { getMessages, setMessages } from '../store/sessionStore.js';
import { getLogger } from '../utils/logger.js';
import { sanitizeToolOutputForAgent } from '../utils/sanitizeToolOutput.js';
import { normalizeAiMessage, normalizeMessagesForModel } from '../store/messageCodec.js';
import {
  prepareHistoryForModel,
  slimMessagesForStorage,
} from '../store/historyWindow.js';

const logger = getLogger('miniAgent');

export type ToolResult = { name: string; args: unknown; output: string };
export type AgentResult = {
  answer: string;
  toolResults: ToolResult[];
  messages: BaseMessage[];
};

function toText(content: AIMessage['content']): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c;
        if (typeof (c as any).text === 'string') return (c as any).text;
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

const SYSTEM_PROMPT =
  'Eres el asistente de Luis David Posada, desarrollador Full Stack Junior Advanced con ~2 años de experiencia profesional. ' +
  'NUNCA inventes años de experiencia (NO digas 5+ años ni senior si no está en los datos). ' +
  'NUNCA menciones al usuario: nombres de herramientas, SMTP, Formspree, MongoDB, variables de entorno, errores técnicos ni configuración interna. ' +
  'Si algo falla en el sistema, responde con amabilidad que hubo un inconveniente temporal y ofrece alternativa (reintentar o email posadaluis451@gmail.com). ' +
  'Detecta si el usuario es reclutador, desarrollador curioso o estudiante y adapta la respuesta. ' +
  'FLUJO RECLUTADOR (vacantes de desarrollador): ' +
  '1) Vacante/JD → analizar_oferta. Resume coincidencias de forma positiva. ' +
  '2) PROHIBIDO decir que Luis no cumple, no encaja, no tiene X stack, o que no deberían contactarlo. ' +
  '3) Si la oferta menciona tecnologías que no aparecen en su CV, di que Luis puede comentar su experiencia relacionada en una conversación directa. ' +
  '4) NO uses porcentajes ni match scores. ' +
  '5) SIEMPRE cierra invitando a dejar contacto (nombre, email, empresa, rol) → enviar_contacto. Luis seguirá la conversación personalmente. ' +
  'Para consultas de precios usa buscar_mejor_precio. Para info general usa buscar_web con moderación. ' +
  'Para tiempo actual usa hora_actual y usa EXACTAMENTE fechaLegible/hora/anio del JSON devuelto; ' +
  'NUNCA calcules ni corrijas la fecha/hora/año con tu propio conocimiento, aunque te parezca distinto. ' +
  'Para matemáticas usa calculadora. ' +
  'Para utilidades simples usa ejecutar_funcion. ' +
  'Para clima usa clima_actual con fechas exactas del JSON (fecha, fechaLegible). Nunca inventes fechas. ' +
  'Para cripto usa cotizacion_cripto. Para divisas conversor_divisas. ' +
  'Para contraseñas generar_contrasena. Para finanzas calculadora_financiera. ' +
  'Para traducción traducir_texto. Para recetas buscar_receta. ' +
  'Para trivia trivia_pregunta con opciones A/B/C/D. Para QR generador_qr. ' +
  'Para CV, curriculum, links o perfil profesional de Luis usa perfil_luis y muestra los enlaces clicables. ' +
  'Para roadmap/bullets crear_roadmap y generar_bullets_cv. ' +
  'Para entrevista entrevista_tecnica mode=start/evaluate. ' +
  'Evita búsquedas repetidas; responde en pocas iteraciones.';

const PORTFOLIO_PROMPT =
  ' MODO PORTAFOLIO: prioriza CV, vacantes y contacto. ' +
  'Para WhatsApp usa contactar_whatsapp (enlace wa.me con mensaje prellenado). ' +
  'Ofrécelo cuando pidan WhatsApp, chat directo o contacto rápido; también tras enviar_contacto como alternativa inmediata.';

function systemPromptForMode(mode: 'portfolio' | 'standalone'): string {
  return mode === 'portfolio' ? SYSTEM_PROMPT + PORTFOLIO_PROMPT : SYSTEM_PROMPT;
}

function historyOptionsForMode(mode: 'portfolio' | 'standalone') {
  return mode === 'portfolio'
    ? { maxTurns: HISTORY_MAX_TURNS_PORTFOLIO, maxTokens: HISTORY_MAX_TOKENS_PORTFOLIO }
    : { maxTurns: HISTORY_MAX_TURNS, maxTokens: HISTORY_MAX_TOKENS };
}

function persistSession(sessionId: string | undefined, messages: BaseMessage[]): void {
  if (!sessionId) return;
  setMessages(sessionId, slimMessagesForStorage(messages));
}

export async function runAgent(
  input: string,
  tools: any[],
  sessionId?: string,
  contextText?: string,
  botMode: 'portfolio' | 'standalone' = 'standalone'
): Promise<AgentResult> {
  logger.debug({ sessionId, inputLength: input.length, hasContext: !!contextText }, 'Iniciando agente');
  
  const model = new ChatOpenAI({
    model: OPENAI_MODEL,
    temperature: 0,
    apiKey: OPENAI_API_KEY,
    configuration: { baseURL: OPENAI_BASE_URL },
  });

  const toolCallingModel = model.bindTools(tools);
  const toolMap = new Map<string, any>(tools.map((t) => [t.name, t]));

  const stored = slimMessagesForStorage(await getMessages(sessionId));
  const history = normalizeMessagesForModel(
    prepareHistoryForModel(stored, historyOptionsForMode(botMode))
  );
  logger.debug(
    { sessionId, storedLength: stored.length, historyLength: history.length, botMode },
    'Historia de sesión preparada'
  );

  const messages: BaseMessage[] = [
    new SystemMessage(systemPromptForMode(botMode)),
    ...history,
    new HumanMessage(input),
  ];

  if (contextText && contextText.trim().length > 0) {
    messages.push(
      new HumanMessage(
        `Contexto adicional del usuario (adjuntos/metadata):\n${contextText.slice(0, 20000)}`
      )
    );
    logger.debug({ contextLength: contextText.length }, 'Contexto agregado a mensajes');
  }

  const toolResults: ToolResult[] = [];

  for (let step = 0; step < 5; step++) {
    logger.debug({ step, sessionId }, 'Invocando modelo');
    const ai = normalizeAiMessage(await toolCallingModel.invoke(messages));
    messages.push(ai);

    const calls = ai.tool_calls ?? [];
    if (!calls.length) {
      const answer = toText(ai.content);
      logger.info({ sessionId, resultLength: answer.length, toolsUsed: toolResults.length }, 'Respuesta generada sin herramientas');
      if (sessionId) persistSession(sessionId, messages);
      return { answer, toolResults, messages };
    }

    logger.debug({ step, sessionId, callCount: calls.length }, `Herramientas llamadas: ${calls.map((c: any) => c.name).join(', ')}`);

    for (const call of calls) {
      const tool = toolMap.get(call.name);
      if (!tool) {
        logger.warn({ step, sessionId, toolName: call.name }, 'Herramienta no encontrada');
        messages.push(
          new ToolMessage({ tool_call_id: call.id ?? '', content: `Herramienta no encontrada: ${call.name}` })
        );
        continue;
      }
      
      logger.debug({ step, sessionId, toolName: call.name, argsKeys: Object.keys(call.args ?? {}) }, 'Ejecutando herramienta');
      const args =
        call.name === 'enviar_contacto' && sessionId
          ? { ...(call.args ?? {}), sessionId }
          : (call.args ?? {});
      const outputRaw = await tool.invoke(args);
      const output =
        typeof outputRaw === 'string' ? outputRaw : JSON.stringify(outputRaw, null, 2);
      const safeOutput = sanitizeToolOutputForAgent(call.name, output);
      toolResults.push({ name: call.name, args: call.args, output });
      logger.debug({ step, sessionId, toolName: call.name, outputLength: output.length }, 'Herramienta completada');
      messages.push(new ToolMessage({ tool_call_id: call.id ?? '', content: safeOutput }));
    }
  }

  const fallback = 'No pude producir una respuesta final en el numero de pasos permitido.';
  logger.warn({ sessionId, toolsUsed: toolResults.length }, 'Alcanzado máximo de pasos del agente');
  if (sessionId) persistSession(sessionId, messages);
  return { answer: fallback, toolResults, messages };
}
