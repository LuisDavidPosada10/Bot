import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('currencyTool');

const cache = new Map<string, { ts: number; rate: number; fuente: string }>();
const CACHE_TTL = 10 * 60 * 1000;

async function fetchFrankfurterRate(from: string, to: string): Promise<number | null> {
  const { data } = await axios.get('https://api.frankfurter.app/latest', {
    params: { from, to },
    timeout: 6000,
  });
  const rate = data?.rates?.[to];
  return rate && !isNaN(rate) ? rate : null;
}

async function fetchOpenErApiRate(from: string, to: string): Promise<number | null> {
  const { data } = await axios.get(`https://open.er-api.com/v6/latest/${from}`, { timeout: 6000 });
  if (data?.result !== 'success') return null;
  const rate = data?.rates?.[to];
  return rate && !isNaN(rate) ? rate : null;
}

async function resolveRate(from: string, to: string): Promise<{ rate: number; fuente: string } | null> {
  try {
    const frankfurter = await fetchFrankfurterRate(from, to);
    if (frankfurter) return { rate: frankfurter, fuente: 'Frankfurter (BCE)' };
  } catch {
    // fallback below
  }
  try {
    const openEr = await fetchOpenErApiRate(from, to);
    if (openEr) return { rate: openEr, fuente: 'open.er-api.com' };
  } catch {
    // no rate
  }
  return null;
}

export const conversorDivisasTool = tool(
  async ({ monto, de, a }: { monto: number; de: string; a: string }) => {
    const from = de.toUpperCase().trim();
    const to = a.toUpperCase().trim();
    logger.debug({ from, to, monto }, 'Convirtiendo divisas');
    if (from === to) {
      logger.debug({ divisa: from }, 'Divisas iguales, retornando 1:1');
      return JSON.stringify({ de: from, a: to, monto, resultado: monto, tasa: 1 });
    }
    const key = from + '_' + to;
    const cached = cache.get(key);
    let rate: number;
    let fuente: string;
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      logger.debug({ from, to }, 'Tasa obtenida del caché');
      rate = cached.rate;
      fuente = cached.fuente;
    } else {
      logger.debug({ from, to }, 'Obteniendo tasa de cambio');
      const resolved = await resolveRate(from, to);
      if (!resolved) {
        logger.warn({ from, to }, 'Tasa no disponible');
        return JSON.stringify({ error: 'Tasa no disponible para ' + from + ' a ' + to });
      }
      rate = resolved.rate;
      fuente = resolved.fuente;
      cache.set(key, { ts: Date.now(), rate, fuente });
      logger.debug({ from, to, rate, fuente }, 'Tasa cacheada');
    }
    const resultado = Math.round(monto * rate * 100) / 100;
    logger.info({ from, to, monto, resultado, tasa: rate }, 'Conversión completada');
    return JSON.stringify({
      de: from,
      a: to,
      monto,
      resultado,
      tasa: Math.round(rate * 10000) / 10000,
      fuente,
    });
  },
  {
    name: 'conversor_divisas',
    description:
      'Convierte entre divisas usando tasas del Banco Central Europeo. ' +
      'Soporta USD, EUR, COP, MXN, GBP, JPY, ARS, CLP, PEN, BRL, CAD, AUD, CHF, CNY, KRW y mas.',
    schema: z.object({
      monto: z.number().describe('Cantidad a convertir'),
      de: z.string().describe('Divisa de origen, ej. USD, EUR, COP'),
      a: z.string().describe('Divisa de destino, ej. MXN, JPY, GBP'),
    }),
  }
);