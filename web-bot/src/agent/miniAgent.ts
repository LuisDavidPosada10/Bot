import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import { OPENAI_MODEL, OPENAI_API_KEY, OPENAI_BASE_URL, HISTORY_MAX_TURNS, HISTORY_MAX_TOKENS, HISTORY_MAX_TURNS_PORTFOLIO, HISTORY_MAX_TOKENS_PORTFOLIO, AGENT_MAX_STEPS } from '../config/env.js';
import { SYSTEM_PROMPT, PORTFOLIO_PROMPT } from './systemPrompt.js';
import { clipForModel, MODEL_LIMITS } from '../utils/clipForModel.js';
import { getMessages, setMessages } from '../store/sessionStore.js';
import { getLogger } from '../utils/logger.js';
import { sanitizeToolOutputForAgent } from '../utils/sanitizeToolOutput.js';
import { normalizeAiMessage, normalizeMessagesForModel } from '../store/messageCodec.js';
import {
  prepareHistoryForModel,
  slimMessagesForStorage,
  truncateHistoryForModel,
  estimateMessageTokens,
} from '../store/historyWindow.js';

const logger = getLogger('miniAgent');

export type ToolResult = { name: string; args: unknown; output: string };
export type AgentResult = {
  answer: string;
  toolResults: ToolResult[];
  messages: BaseMessage[];
};

function looksLikeFalseFailure(answer: string): boolean {
  return /inconveniente temporal|no pude obtener|intenta nuevamente|intenta de nuevo/i.test(answer);
}

function formatClimaFromToolOutput(output: string): string | null {
  try {
    const d = JSON.parse(output) as Record<string, unknown>;
    if (d.error || typeof d.ciudad !== 'string') return null;
    const lines = [
      `**Clima en ${d.ciudad}${d.pais ? `, ${d.pais}` : ''}**`,
      `- Temperatura: **${d.temperatura}** (sensación ${d.sensacionTermica})`,
      `- Condición: ${d.descripcion}`,
      `- Humedad: ${d.humedad} · Viento: ${d.viento}`,
    ];
    const forecast = d.pronostico3dias as Array<{
      diaRelativo?: string;
      fechaLegible?: string;
      max?: string;
      min?: string;
      descripcion?: string;
    }> | undefined;
    if (forecast?.length) {
      lines.push('', '**Próximos días:**');
      for (const day of forecast) {
        lines.push(
          `- ${day.diaRelativo ?? day.fechaLegible}: ${day.max} / ${day.min}${day.descripcion ? ` — ${day.descripcion}` : ''}`
        );
      }
    }
    return lines.join('\n');
  } catch {
    return null;
  }
}

function formatRecetaFromToolOutput(output: string): string | null {
  try {
    const d = JSON.parse(output) as {
      error?: string;
      nombre?: string;
      categoria?: string;
      ingredientes?: Array<{ ingrediente: string; medida: string }>;
      instrucciones?: string;
    };
    if (d.error || !d.nombre) return null;
    const ings = (d.ingredientes ?? [])
      .map((i) => `- ${i.ingrediente}${i.medida ? ` (${i.medida})` : ''}`)
      .join('\n');
    const steps = d.instrucciones?.slice(0, 900) ?? '';
    return `**${d.nombre}**${d.categoria ? ` · ${d.categoria}` : ''}\n\n**Ingredientes:**\n${ings}\n\n**Preparación:**\n${steps}`;
  } catch {
    return null;
  }
}

function formatTranslateFromToolOutput(output: string): string | null {
  try {
    const d = JSON.parse(output) as { traduccion?: string; error?: string };
    if (d.error || typeof d.traduccion !== 'string') return null;
    return d.traduccion;
  } catch {
    return null;
  }
}

const TOOL_OUTPUT_FORMATTERS: Record<string, (output: string) => string | null> = {
  clima_actual: formatClimaFromToolOutput,
  perfil_luis: formatPerfilFromToolOutput,
  traducir_texto: formatTranslateFromToolOutput,
  buscar_receta: formatRecetaFromToolOutput,
};

function applyToolFallbacks(
  answer: string,
  toolResults: ToolResult[],
  sessionId?: string
): string {
  if (!looksLikeFalseFailure(answer)) return answer;
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const tr = toolResults[i];
    const formatter = TOOL_OUTPUT_FORMATTERS[tr.name];
    if (!formatter) continue;
    const fixed = formatter(tr.output);
    if (fixed) {
      logger.warn({ sessionId, tool: tr.name }, 'Corrigiendo respuesta errónea del modelo tras herramienta exitosa');
      return fixed;
    }
  }
  return answer;
}

function isTranslateIntent(input: string): boolean {
  return /\b(traduce|traducir|translate)\b/i.test(input);
}

async function directTranslateFallback(toolMap: Map<string, any>, input: string): Promise<string | null> {
  const tool = toolMap.get('traducir_texto');
  if (!tool) return null;
  const match = input.match(/traduc(?:e|ir)(?:\s+al?\s+([\wáéíóúñ]+))?[:\s]+(.+)/i);
  if (!match) return null;
  const langWord = match[1]?.toLowerCase() ?? 'ingles';
  const texto = match[2].trim();
  const toLang: Record<string, string> = {
    ingles: 'en',
    inglés: 'en',
    english: 'en',
    frances: 'fr',
    francés: 'fr',
    aleman: 'de',
    alemán: 'de',
    portugues: 'pt',
    portugués: 'pt',
    italiano: 'it',
    italiana: 'it',
  };
  const a = toLang[langWord] ?? 'en';
  const raw = await tool.invoke({ texto, a, de: 'es' });
  const output = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return formatTranslateFromToolOutput(output);
}

function formatPerfilFromToolOutput(output: string): string | null {
  try {
    const d = JSON.parse(output) as { mensajeSugerido?: string; error?: string };
    if (d.error || typeof d.mensajeSugerido !== 'string') return null;
    return d.mensajeSugerido;
  } catch {
    return null;
  }
}

function isGroqToolValidationError(err: unknown): boolean {
  const e = err as { status?: number; message?: string; error?: { code?: string; message?: string } };
  const msg = String(e?.message ?? e?.error?.message ?? '');
  return (
    e?.status === 400 &&
    (e?.error?.code === 'tool_use_failed' || msg.includes('Tool call validation failed'))
  );
}

function isProfileIntent(input: string): boolean {
  return /\b(perfil profesional|curriculum|curriculum vitae|\bcv\b|hoja de vida|linkedin|github|links de luis|datos de luis|contacto de luis|quien es luis)\b/i.test(
    input
  );
}

async function invokePerfilLuisFallback(
  toolMap: Map<string, any>,
  input: string,
  sessionId: string | undefined,
  messages: BaseMessage[]
): Promise<AgentResult | null> {
  if (!isProfileIntent(input) || !toolMap.has('perfil_luis')) return null;
  const tool = toolMap.get('perfil_luis')!;
  const outputRaw = await tool.invoke({});
  const output = typeof outputRaw === 'string' ? outputRaw : JSON.stringify(outputRaw, null, 2);
  const answer = formatPerfilFromToolOutput(output);
  if (!answer) return null;
  logger.warn({ sessionId }, 'Fallback directo a perfil_luis tras error de validación Groq');
  const toolResults: ToolResult[] = [{ name: 'perfil_luis', args: {}, output }];
  if (sessionId) persistSession(sessionId, messages);
  return { answer, toolResults, messages };
}

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
  const history = truncateHistoryForModel(
    normalizeMessagesForModel(
      prepareHistoryForModel(stored, historyOptionsForMode(botMode))
    )
  );
  logger.debug(
    {
      sessionId,
      storedLength: stored.length,
      historyLength: history.length,
      historyTokensEst: estimateMessageTokens(history),
      botMode,
      toolCount: tools.length,
    },
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
        `Contexto adicional del usuario (adjuntos/metadata):\n${contextText.slice(0, 6000)}`
      )
    );
    logger.debug({ contextLength: contextText.length }, 'Contexto agregado a mensajes');
  }

  const toolResults: ToolResult[] = [];

  for (let step = 0; step < AGENT_MAX_STEPS; step++) {
    logger.debug({ step, sessionId }, 'Invocando modelo');
    let ai: AIMessage;
    try {
      ai = normalizeAiMessage(await toolCallingModel.invoke(messages));
    } catch (err) {
      const fallback = await invokePerfilLuisFallback(toolMap, input, sessionId, messages);
      if (isGroqToolValidationError(err) && fallback) {
        return fallback;
      }
      throw err;
    }
    messages.push(ai);

    const calls = ai.tool_calls ?? [];
    if (!calls.length) {
      let answer = toText(ai.content);
      answer = applyToolFallbacks(answer, toolResults, sessionId);
      if (looksLikeFalseFailure(answer) && isTranslateIntent(input)) {
        const translated = await directTranslateFallback(toolMap, input);
        if (translated) {
          logger.warn({ sessionId }, 'Fallback directo a traducir_texto tras respuesta errónea');
          answer = translated;
          toolResults.push({ name: 'traducir_texto', args: {}, output: JSON.stringify({ traduccion: translated }) });
        }
      }
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
      const safeOutput = clipForModel(
        sanitizeToolOutputForAgent(call.name, output),
        MODEL_LIMITS.toolMessageChars
      );
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
