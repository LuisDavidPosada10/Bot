import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('timeTool');

export const horaActualTool = tool(
  async () => {
    const now = new Date();
    const iso = now.toISOString();
    const fechaLegible = now.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    logger.debug({ timestamp: iso }, 'Hora solicitada');
    return JSON.stringify({
      fechaHoraISO: iso,
      fechaLegible,
      hora,
      anio: now.getFullYear(),
      nota:
        'Usa EXACTAMENTE estos valores (fechaLegible, hora, anio). ' +
        'NUNCA calcules, corrijas o inventes la fecha/año desde tu conocimiento previo.',
    });
  },
  {
    name: 'hora_actual',
    description:
      'Devuelve la fecha y hora actual real del servidor (ISO 8601, fecha legible, hora y año). ' +
      'Usa siempre estos valores tal cual; no los reemplaces con una fecha estimada.',
    schema: z.object({}),
  }
);
