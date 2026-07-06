import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('bestPriceTool');

type Candidate = { store: string; url: string };

function headers() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
  };
}

function sanitizeUrl(u?: string): string {
  if (!u) return '';
  const s = u.trim().replace(/[`'\\]/g, '');
  return s;
}

function priceCandidates(text: string): number[] {
  const vals: number[] = [];
  const regex =
    /(?:US?\$|USD|\$|€|£|MXN|ARS|COP|CLP|PEN)\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d{2,6})/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    let raw = m[1].replace(/\./g, '').replace(/,/g, '.');
    const n = Number(raw);
    if (!isNaN(n)) vals.push(n);
  }
  return vals.sort((a, b) => a - b);
}

function normalizeWholeFraction(whole?: string, frac?: string): number | undefined {
  if (!whole) return undefined;
  const w = Number(whole.replace(/[^\d]/g, ''));
  const f = frac ? Number(frac.replace(/[^\d]/g, '')) : 0;
  if (isNaN(w)) return undefined;
  return f ? w + f / 100 : w;
}

function isPlausiblePrice(n?: number): boolean {
  if (typeof n !== 'number') return false;
  if (!isFinite(n)) return false;
  return n >= 50 && n <= 5000;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, { headers: headers(), timeout: 12000 });
    return res.data as string;
  } catch {
    return null;
  }
}

function mapCurrencyByDomain(url: string): string {
  if (url.includes('mercadolibre.com.mx')) return 'MXN';
  if (url.includes('mercadolibre.com.ar')) return 'ARS';
  if (url.includes('mercadolibre.com.co')) return 'COP';
  if (url.includes('mercadolibre.com.cl')) return 'CLP';
  if (url.includes('mercadolibre.com.pe')) return 'PEN';
  if (url.includes('ebay.com')) return 'USD';
  if (url.includes('amazon.com')) return 'USD';
  if (url.includes('apple.com')) return 'USD';
  if (url.includes('walmart.com')) return 'USD';
  if (url.includes('bestbuy.com')) return 'USD';
  return 'USD';
}

async function scrapeEbay(query: string): Promise<{ store: string; url: string; price?: number; currency: string; title?: string }[]> {
  const url = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(query);
  const html = await fetchHtml(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const out: any[] = [];
  $('.s-item').slice(0, 5).each((_, el) => {
    const title = $(el).find('.s-item__title').text().trim();
    const priceText = $(el).find('.s-item__price').first().text().trim();
    const link = $(el).find('a.s-item__link').attr('href') ?? url;
    const vals = priceCandidates(priceText);
    const p = vals.length ? vals[0] : undefined;
    out.push({
      store: 'eBay',
      url: link,
      price: isPlausiblePrice(p) ? p : undefined,
      currency: 'USD',
      title,
    });
  });
  return out;
}

async function scrapeApple(): Promise<{ store: string; url: string; price?: number; currency: string; title?: string }[]> {
  const url = 'https://www.apple.com/shop/buy-iphone/iphone-13';
  const html = await fetchHtml(url);
  if (!html) return [{ store: 'Apple', url, price: undefined, currency: 'USD', title: 'iPhone 13' }];
  const notFound =
    /Page Not Found/i.test(html) ||
    /can.?t be.?found/i.test(html);
  if (notFound) {
    return [{ store: 'Apple', url, price: undefined, currency: 'USD', title: 'iPhone 13' }];
  }
  return [{ store: 'Apple', url, price: undefined, currency: 'USD', title: 'iPhone 13' }];
}

async function scrapeMercadoLibre(country: string, query: string): Promise<{ store: string; url: string; price?: number; currency: string; title?: string }[]> {
  const domainMap: Record<string, string> = {
    mx: 'https://listado.mercadolibre.com.mx/',
    ar: 'https://listado.mercadolibre.com.ar/',
    co: 'https://listado.mercadolibre.com.co/',
    cl: 'https://listado.mercadolibre.com.cl/',
    pe: 'https://listado.mercadolibre.com.pe/',
  };
  const base = domainMap[country];
  if (!base) return [];
  const url = base + encodeURIComponent(query);
  const html = await fetchHtml(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const out: any[] = [];
  $('.ui-search-result__wrapper').slice(0, 5).each((_, el) => {
    const title = $(el).find('.ui-search-item__title').text().trim();
    const priceText = $(el).find('.ui-search-price__second-line').text().trim();
    const link = $(el).find('a.ui-search-link').attr('href') ?? url;
    const vals = priceCandidates(priceText || html);
    const p = vals.length ? vals[0] : undefined;
    out.push({
      store: 'MercadoLibre',
      url: sanitizeUrl(link),
      price: isPlausiblePrice(p) ? p : undefined,
      currency: mapCurrencyByDomain(url),
      title,
    });
  });
  return out.filter((i) => i.title && i.title.length > 1 && typeof i.price === 'number');
}

async function scrapeAmazon(query: string): Promise<{ store: string; url: string; price?: number; currency: string; title?: string }[]> {
  const url = 'https://www.amazon.com/s?k=' + encodeURIComponent(query);
  const html = await fetchHtml(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const out: any[] = [];
  $('.s-result-item').slice(0, 5).each((_, el) => {
    const title = $(el).find('h2 a span').text().trim();
    const link = $(el).find('h2 a').attr('href');
    const whole = $(el).find('.a-price .a-price-whole').first().text();
    const frac = $(el).find('.a-price .a-price-fraction').first().text();
    const p = normalizeWholeFraction(whole, frac);
    out.push({
      store: 'Amazon',
      url: sanitizeUrl(link ? 'https://www.amazon.com' + link : url),
      price: isPlausiblePrice(p) ? p : undefined,
      currency: 'USD',
      title,
    });
  });
  return out.filter((i) => i.title && i.title.length > 1 && typeof i.price === 'number');
}

async function scrapeWalmart(query: string): Promise<{ store: string; url: string; price?: number; currency: string; title?: string }[]> {
  const url = 'https://www.walmart.com/search?q=' + encodeURIComponent(query);
  const html = await fetchHtml(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const out: any[] = [];
  $('[data-automation-id="search-result-gridview-item"], .mb3').slice(0, 5).each((_, el) => {
    const title = $(el).find('a[href*="/ip/"], a[data-automation-id="productTitleLink"]').text().trim();
    const link = $(el).find('a[href*="/ip/"], a[data-automation-id="productTitleLink"]').attr('href');
    const priceText = $(el).find('[data-automation-id="product-price"]').text().trim() || $(el).find('.price-main').text().trim();
    const vals = priceCandidates(priceText);
    const p = vals.length ? vals[0] : undefined;
    out.push({
      store: 'Walmart',
      url: sanitizeUrl(link ? 'https://www.walmart.com' + link : url),
      price: isPlausiblePrice(p) ? p : undefined,
      currency: 'USD',
      title,
    });
  });
  return out.filter((i) => i.title && i.title.length > 1 && typeof i.price === 'number');
}

async function scrapeBestBuy(query: string): Promise<{ store: string; url: string; price?: number; currency: string; title?: string }[]> {
  const url = 'https://www.bestbuy.com/site/searchpage.jsp?st=' + encodeURIComponent(query);
  const html = await fetchHtml(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const out: any[] = [];
  $('li.sku-item').slice(0, 5).each((_, el) => {
    const title = $(el).find('.sku-title h4 a, h4.sku-header a').text().trim();
    const link = $(el).find('.sku-title h4 a, h4.sku-header a').attr('href');
    const priceText = $(el).find('.priceView-customer-price span[aria-hidden="true"]').first().text().trim();
    const vals = priceCandidates(priceText);
    const p = vals.length ? vals[0] : undefined;
    out.push({
      store: 'BestBuy',
      url: sanitizeUrl(link ? 'https://www.bestbuy.com' + link : url),
      price: isPlausiblePrice(p) ? p : undefined,
      currency: 'USD',
      title,
    });
  });
  return out.filter((i) => i.title && i.title.length > 1 && typeof i.price === 'number');
}

export const buscarMejorPrecioTool = tool(
  async ({
    product,
    country,
  }: {
    product: string;
    country?: string;
  }) => {
    logger.debug({ product, country }, 'Buscando mejores precios');
    const q = product;
    const results: any[] = [];
    const cc = (country ?? 'co').toLowerCase();
    if (cc !== 'us') {
      results.push(...(await scrapeMercadoLibre(cc, q)));
    } else {
      results.push(...(await scrapeEbay(q)));
      results.push(...(await scrapeApple()));
      results.push(...(await scrapeAmazon(q)));
      results.push(...(await scrapeWalmart(q)));
      results.push(...(await scrapeBestBuy(q)));
    }
    const filteredRaw = results.filter((r) => r && r.url);
    const dedup: Record<string, any> = {};
    for (const r of filteredRaw) {
      const urlKey = sanitizeUrl(r.url);
      const key = r.store + '|' + urlKey;
      const item = {
        store: r.store,
        url: urlKey,
        price: typeof r.price === 'number' ? r.price : null,
        currency: r.currency,
        title: r.title && r.title.trim().length > 0 ? r.title : q,
      };
      if (!dedup[key]) {
        dedup[key] = item;
      } else {
        const prev = dedup[key];
        const av = typeof item.price === 'number' ? item.price : Number.MAX_SAFE_INTEGER;
        const pv = typeof prev.price === 'number' ? prev.price : Number.MAX_SAFE_INTEGER;
        if (av < pv) dedup[key] = item;
      }
    }
    const filtered = Object.values(dedup);
    const byCurrency: Record<string, any[]> = {};
    for (const item of filtered) {
      const c = item.currency || 'USD';
      byCurrency[c] = byCurrency[c] || [];
      byCurrency[c].push(item);
    }
    for (const c of Object.keys(byCurrency)) {
      byCurrency[c].sort((a, b) => {
        const av = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
        const bv = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
        return av - bv;
      });
    }
    logger.info({ product, country: cc, resultsCount: filtered.length, currencies: Object.keys(byCurrency) }, 'Búsqueda de precios completada');
    return JSON.stringify({
      query: q,
      bestByCurrency: byCurrency,
    });
  },
  {
    name: 'buscar_mejor_precio',
    description:
      'Busca precios en e-commerce conocidos y devuelve el mejor precio por moneda.',
    schema: z.object({
      product: z.string().describe('Producto a buscar, por ejemplo "iPhone 13"'),
      country: z
        .string()
        .optional()
        .describe('Código de país opcional, ej. "us", "mx", "ar"'),
    }),
  }
);
