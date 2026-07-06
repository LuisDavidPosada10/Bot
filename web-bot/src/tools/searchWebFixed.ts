import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { search } from 'duck-duck-scrape';
import { TavilySearch } from '@langchain/tavily';
import { TAVILY_API_KEY } from '../config/env.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('searchWebTool');

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { ts: number; data: string }>();
let lastCallTs = 0;

function normalize(q: string) {
  return q.toLowerCase().replace(/\s+/g, ' ').trim();
}

export const buscarWebTool = tool(
  async ({ query, maxResults }: { query: string; maxResults?: number }) => {
    const limit = Math.max(1, Math.min(maxResults ?? 5, 10));
    const norm = normalize(query);
    logger.debug({ query, limit }, 'Iniciando búsqueda web');

    const cached = cache.get(norm);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      logger.debug({ query }, 'Búsqueda obtenida del caché');
      return cached.data;
    }

    const now = Date.now();
    const since = now - lastCallTs;
    const minDelay = 3000;
    if (since < minDelay) {
      await new Promise((r) => setTimeout(r, minDelay - since));
    }
    lastCallTs = Date.now();

    try {
      logger.debug({ query }, 'Buscando con DuckDuckGo');
      const result = await search(query);
      const items = (result?.results ?? [])
        .slice(0, limit)
        .map((r: any) => ({
          title: r.title,
          snippet: r.description,
          url: r.url,
        }));
      const payload = JSON.stringify(items);
      cache.set(norm, { ts: Date.now(), data: payload });
      logger.info({ query, resultCount: items.length }, 'Búsqueda exitosa');
      return payload;
    } catch (err: any) {
      logger.warn({ err, query }, 'Error en primer intento, reintentando');
      await new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
      try {
        logger.debug({ query }, 'Reintentando búsqueda con DuckDuckGo');
        const result = await search(query);
        const items = (result?.results ?? [])
          .slice(0, limit)
          .map((r: any) => ({
            title: r.title,
            snippet: r.description,
            url: r.url,
          }));
        const payload = JSON.stringify(items);
        cache.set(norm, { ts: Date.now(), data: payload });
        logger.info({ query, resultCount: items.length }, 'Búsqueda exitosa en reintento');
        return payload;
      } catch (err2: any) {
        logger.warn({ err: err2, query }, 'Error en reintento, intentando Tavily');
        if (TAVILY_API_KEY) {
          try {
            const tavily = new TavilySearch({
              tavilyApiKey: TAVILY_API_KEY,
              maxResults: limit,
            });
            logger.debug({ query }, 'Buscando con Tavily');
            const tavRes: any = await tavily.invoke({ query });
            let payload: string;
            try {
              const parsed = typeof tavRes === 'string' ? JSON.parse(tavRes) : tavRes;
              const items = Array.isArray(parsed)
                ? parsed.map((it: any) => ({
                    title: it.title ?? it.url ?? 'resultado',
                    snippet: it.content ?? it.snippet ?? '',
                    url: it.url ?? null,
                  }))
                : [{ title: 'resultado', snippet: String(tavRes), url: null }];
              payload = JSON.stringify(items.slice(0, limit));
            } catch {
              payload = JSON.stringify([{ title: 'resultado', snippet: String(tavRes), url: null }]);
            }
            cache.set(norm, { ts: Date.now(), data: payload });
            logger.info({ query }, 'Búsqueda exitosa con Tavily');
            return payload;
          } catch (tavilyErr: any) {
            logger.error({ err: tavilyErr, query }, 'Error en Tavily');
            return JSON.stringify({
              error: 'BUSQUEDA_FALLIDA',
              message:
                'No se pudo realizar la búsqueda. Intenta nuevamente en unos segundos o configura TAVILY_API_KEY.',
              details: tavilyErr?.message ?? String(tavilyErr),
            });
          }
        }
        logger.error({ err: err2, query }, 'Búsqueda fallida, sin Tavily');
        return JSON.stringify({
          error: 'BUSQUEDA_FALLIDA',
          message:
            'No se pudo realizar la búsqueda. Intenta nuevamente en unos segundos o configura TAVILY_API_KEY.',
          details: err2?.message ?? String(err2),
        });
      }
    }
  },
  {
    name: 'buscar_web',
    description:
      'Busca en la web y devuelve hasta N resultados con título, snippet y url.',
    schema: z.object({
      query: z.string().describe('Consulta a buscar en la web'),
      maxResults: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Máximo de resultados a devolver (por defecto 5)'),
    }),
  }
);
