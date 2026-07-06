import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('triviaTool');

const CATEGORIES: Record<number, string> = {
  9: 'General', 10: 'Entretenimiento: Libros', 11: 'Películas', 12: 'Música',
  14: 'Televisión', 15: 'Videojuegos', 17: 'Ciencias y Naturaleza',
  18: 'Computación', 19: 'Matemáticas', 20: 'Mitología', 21: 'Deportes',
  22: 'Geografía', 23: 'Historia', 24: 'Política', 25: 'Arte', 27: 'Animales',
};

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"').replace(/&rsquo;/g, "'").replace(/&hellip;/g, '...');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const triviaPreguntaTool = tool(
  async ({ dificultad, categoriaId, respuesta }: {
    dificultad?: 'easy' | 'medium' | 'hard';
    categoriaId?: number;
    respuesta?: string;
  }) => {
    const axios = (await import('axios')).default;
    if (respuesta !== undefined) {
      logger.debug({ respuesta }, 'Evaluando respuesta de trivia');
      return JSON.stringify({
        nota: 'Para evaluar una respuesta, pasa la respuesta correcta externamente. El agente debe comparar.',
        respuestaRecibida: respuesta,
      });
    }
    logger.debug({ difficulty: dificultad, categoryId: categoriaId }, 'Obteniendo pregunta de trivia');
    const params: Record<string, string | number> = { amount: 1, type: 'multiple' };
    if (dificultad) params.difficulty = dificultad;
    if (categoriaId && CATEGORIES[categoriaId]) params.category = categoriaId;
    try {
      const { data } = await axios.get('https://opentdb.com/api.php', {
        params,
        timeout: 8000,
        headers: { Accept: 'application/json' },
      });
      if (data?.response_code !== 0 || !data?.results?.length) {
        logger.warn({ responseCode: data?.response_code }, 'No se obtuvo pregunta de trivia');
        return JSON.stringify({ error: 'No se pudo obtener una pregunta. Intenta de nuevo.' });
      }
      const q = data.results[0];
      const correcta = decodeHtml(q.correct_answer as string);
      const incorrectas = (q.incorrect_answers as string[]).map(decodeHtml);
      const opciones = shuffle([correcta, ...incorrectas]);
      const letras = ['A', 'B', 'C', 'D'];
      const opcionesLetras = opciones.map((op, i) => `${letras[i]}) ${op}`);
      const indiceCorrecta = opciones.indexOf(correcta);
      logger.info({ category: q.category, difficulty: q.difficulty }, 'Pregunta de trivia obtenida');
      return JSON.stringify({
        pregunta: decodeHtml(q.question as string),
        opciones: opcionesLetras,
        respuestaCorrecta: `${letras[indiceCorrecta]}) ${correcta}`,
        categoria: decodeHtml(q.category as string),
        dificultad: q.difficulty,
        instruccion: 'El usuario debe responder con A, B, C o D. Luego revela si acertó y la respuesta correcta.',
      });
    } catch (err: any) {
      logger.error({ err, difficulty: dificultad, categoriaId }, 'Error al obtener pregunta de trivia');
      return JSON.stringify({ error: 'Error al obtener pregunta de trivia', detalles: err?.message });
    }
  },
  {
    name: 'trivia_pregunta',
    description:
      'Obtiene una pregunta de trivia con 4 opciones (A/B/C/D) y la respuesta correcta. ' +
      'Temas: historia, ciencia, deportes, geografía, cine, música, videojuegos y más. ' +
      'Dificultades: easy (fácil), medium (media), hard (difícil).',
    schema: z.object({
      dificultad: z.enum(['easy', 'medium', 'hard']).optional().describe('Dificultad: easy, medium o hard'),
      categoriaId: z.number().int().optional().describe(
        'ID de categoría: 9=General, 17=Ciencias, 18=Computación, 21=Deportes, 22=Geografía, 23=Historia, 11=Películas, 12=Música'
      ),
      respuesta: z.string().optional().describe('No usar. Reservado para uso interno.'),
    }),
  }
);