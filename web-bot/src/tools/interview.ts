import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL } from '../config/env.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('interviewTool');

function clampProgress(p: number): number {
  if (!Number.isFinite(p)) return 0;
  if (p < 0) return 0;
  if (p > 100) return 100;
  return Math.round(p);
}

export const entrevistaTecnicaTool = tool(
  async ({
    mode,
    topic,
    level,
    previousAnswer,
  }: {
    mode: 'start' | 'evaluate';
    topic: string;
    level: 'junior' | 'mid' | 'senior';
    previousAnswer?: string;
  }) => {
    logger.debug({ mode, topic, level }, 'Iniciando sesión de entrevista técnica');
    const model = new ChatOpenAI({
      model: OPENAI_MODEL,
      temperature: 0,
      apiKey: OPENAI_API_KEY,
      configuration: { baseURL: OPENAI_BASE_URL },
    });
    if (mode === 'start') {
      const prompt =
        `Genera una primera pregunta de entrevista técnica (${topic}, nivel ${level}). ` +
        `Incluye: pregunta, criterios de evaluación (rubrica) y una pista breve. ` +
        `Devuelve JSON con {question, rubric, hint, progress}. El progress inicia en 0.`;
      logger.debug({ prompt }, 'Generando pregunta inicial');
      const res = await model.invoke(prompt);
      try {
        const txt = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
        const parsed = JSON.parse(txt);
        parsed.progress = clampProgress(parsed.progress ?? 0);
        logger.info({ topic, level }, 'Pregunta inicial generada exitosamente');
        return JSON.stringify(parsed);
      } catch (err: any) {
        logger.warn({ err, topic, level }, 'Error al parsear respuesta del modelo, usando default');
        return JSON.stringify({
          question: `Explica una decisión de arquitectura en ${topic} para nivel ${level}.`,
          rubric: ['claridad', 'profundidad técnica', 'trade-offs', 'ejemplos'],
          hint: 'Piensa en escalabilidad, mantenimiento y seguridad.',
          progress: 0,
        });
      }
    }
    const ans = (previousAnswer ?? '').trim();
    const promptEval =
      `Evalúa la respuesta del candidato a una entrevista técnica (${topic}, nivel ${level}). ` +
      `Respuesta: """${ans}""" ` +
      `Devuelve JSON con {feedback, score, nextQuestion, rubric, progress}. ` +
      `score entre 0 y 100; incrementa progress en ~20 si la respuesta es sólida.`;
    logger.debug({ answerLength: ans.length, topic, level }, 'Evaluando respuesta');
    const res2 = await model.invoke(promptEval);
    try {
      const txt = typeof res2.content === 'string' ? res2.content : JSON.stringify(res2.content);
      const parsed = JSON.parse(txt);
      parsed.score = clampProgress(parsed.score ?? 0);
      parsed.progress = clampProgress(parsed.progress ?? 20);
      logger.info({ score: parsed.score, progress: parsed.progress, topic, level }, 'Respuesta evaluada exitosamente');
      return JSON.stringify(parsed);
    } catch (err: any) {
      logger.warn({ err, topic, level }, 'Error al parsear evaluación, usando default');
      return JSON.stringify({
        feedback: 'Respuesta evaluada: aporta claridad pero falta profundizar en trade-offs y métricas.',
        score: 65,
        nextQuestion: 'Diseña una estrategia de pruebas y observabilidad para tu solución.',
        rubric: ['criterios medibles', 'cobertura', 'monitoring', 'alerting'],
        progress: 20,
      });
    }
  },
  {
    name: 'entrevista_tecnica',
    description:
      'Simula una entrevista técnica, genera preguntas y evalúa respuestas con feedback y progreso.',
    schema: z.object({
      mode: z.enum(['start', 'evaluate']).describe('Modo: start para iniciar, evaluate para evaluar respuesta'),
      topic: z.string().describe('Tema principal, ej. backend, frontend, algoritmos'),
      level: z.enum(['junior', 'mid', 'senior']).describe('Nivel del candidato'),
      previousAnswer: z.string().optional().describe('Respuesta previa del candidato para evaluación'),
    }),
  }
);
