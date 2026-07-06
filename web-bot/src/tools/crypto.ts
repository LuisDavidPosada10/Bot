import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('cryptoTool');

const COIN_IDS: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  ada: 'cardano', cardano: 'cardano',
  bnb: 'binancecoin', binancecoin: 'binancecoin',
  xrp: 'ripple', ripple: 'ripple',
  doge: 'dogecoin', dogecoin: 'dogecoin',
  dot: 'polkadot', polkadot: 'polkadot',
  matic: 'matic-network', polygon: 'matic-network',
  link: 'chainlink', chainlink: 'chainlink',
  ltc: 'litecoin', litecoin: 'litecoin',
  avax: 'avalanche-2', avalanche: 'avalanche-2',
  usdt: 'tether', tether: 'tether',
  usdc: 'usd-coin',
  shib: 'shiba-inu',
  uni: 'uniswap', uniswap: 'uniswap',
};

const cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 60 * 1000;

export const cotizacionCriptoTool = tool(
  async ({ monedas, divisa }: { monedas: string[]; divisa?: string }) => {
    const vs = (divisa ?? 'usd').toLowerCase();
    const ids = Array.from(
      new Set(monedas.map((m) => COIN_IDS[m.toLowerCase()] ?? m.toLowerCase()))
    ).join(',');
    const cacheKey = ids + '_' + vs;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      logger.debug({ coins: ids, divisa: vs }, 'Cotización obtenida del caché');
      return JSON.stringify(cached.data);
    }
    try {
      logger.debug({ coins: ids, divisa: vs }, 'Obteniendo cotización de criptomonedas');
      const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: { ids, vs_currencies: vs, include_24hr_change: 'true', include_market_cap: 'true' },
        timeout: 8000,
        headers: { Accept: 'application/json' },
      });
      const result: Record<string, unknown> = {};
      for (const [coin, info] of Object.entries(data as Record<string, Record<string, number>>)) {
        const change = info[vs + '_24h_change'] ?? 0;
        result[coin] = {
          precio: info[vs],
          cambio24h: change.toFixed(2) + '%',
          tendencia: change >= 0 ? 'sube' : 'baja',
          divisa: vs.toUpperCase(),
        };
      }
      cache.set(cacheKey, { ts: Date.now(), data: result });
      logger.info({ coins: ids, divisa: vs }, 'Cotización obtenida exitosamente');
      return JSON.stringify(result);
    } catch (err: any) {
      logger.error({ err, coins: ids, divisa: vs }, 'Error al obtener cotización de criptomonedas');
      return JSON.stringify({ error: 'No se pudo obtener precios de criptomonedas', detalles: err?.message });
    }
  },
  {
    name: 'cotizacion_cripto',
    description:
      'Obtiene precios actuales de criptomonedas con variacion 24h. Soporta BTC, ETH, SOL, BNB, ADA, DOGE, XRP, MATIC, LINK, LTC, AVAX, etc.',
    schema: z.object({
      monedas: z.array(z.string()).min(1).describe('Lista de criptomonedas, ej. ["btc", "eth", "sol"]'),
      divisa: z.string().optional().describe('Divisa de cotizacion: usd, eur, cop, mxn, ars, etc. Por defecto USD'),
    }),
  }
);