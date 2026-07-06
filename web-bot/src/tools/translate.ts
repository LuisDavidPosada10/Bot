import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('translateTool');

const LANG_NAMES: Record<string, string> = {
  es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán', pt: 'Portugués',
  it: 'Italiano', ja: 'Japonés', zh: 'Chino', ru: 'Ruso', ar: 'Árabe',
  ko: 'Coreano', nl: 'Holandés', pl: 'Polaco', sv: 'Sueco', tr: 'Turco',
};

export const traducirTextoTool = tool(
  async ({ texto, de, a }: { texto: string; de?: string; a: string }) => {
    const raw = texto.trim();
    if (!raw) {
      logger.warn('Texto vacío para traducción');
      return JSON.stringify({ error: 'El texto no puede estar vacío' });
    }
    const fromCode = (de ?? 'autodetect').toLowerCase().trim();
    const toCode = a.toLowerCase().trim();
    logger.debug({ from: fromCode, to: toCode, textLength: raw.length }, 'Iniciando traducción');
    const langpair = `${fromCode}|${toCode}`;
    const MAX_CHUNK = 450;
    const chunks: string[] = [];
    for (let i = 0; i < raw.length; i += MAX_CHUNK) chunks.push(raw.slice(i, i + MAX_CHUNK));
    try {
      const parts: string[] = [];
      for (const chunk of chunks.slice(0, 6)) {
        const { data } = await axios.get('https://api.mymemory.translated.net/get', {
          params: { q: chunk, langpair },
          timeout: 10000,
          headers: { Accept: 'application/json' },
        });
        if (data?.responseStatus !== 200) {
          logger.warn({ responseStatus: data?.responseStatus, responseDetails: data?.responseDetails }, 'Traducción fallida');
          return JSON.stringify({ error: 'Traducción fallida', detalle: data?.responseDetails ?? 'error desconocido' });
        }
        parts.push(data.responseData.translatedText as string);
      }
      logger.info({ from: fromCode, to: toCode, chunks: chunks.length }, 'Traducción completada exitosamente');
      return JSON.stringify({
        traduccion: parts.join(' '),
        de: LANG_NAMES[fromCode] ?? fromCode,
        a: LANG_NAMES[toCode] ?? toCode,
        caracteres: raw.length,
      });
    } catch (err: any) {
      logger.error({ err, from: fromCode, to: toCode }, 'Error en servicio de traducción');
      return JSON.stringify({ error: 'Error al conectar con el servicio de traducción', detalles: err?.message });
    }
  },
  {
    name: 'traducir_texto',
    description:
      'Traduce texto entre más de 50 idiomas. Detecta automáticamente el idioma origen si no se especifica. ' +
      'Códigos: es=español, en=inglés, fr=francés, de=alemán, pt=portugués, it=italiano, ja=japonés, zh=chino, ru=ruso, ar=árabe, ko=coreano.',
    schema: z.object({
      texto: z.string().min(1).describe('Texto a traducir'),
      de: z.string().optional().describe('Código del idioma origen (ej. es, en, fr). Omitir para autodetectar'),
      a: z.string().describe('Código del idioma destino (ej. es, en, fr, de, ja)'),
    }),
  }
);