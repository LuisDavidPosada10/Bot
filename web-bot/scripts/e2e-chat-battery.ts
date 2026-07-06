/**
 * Batería E2E del chat: frases variadas, modos portfolio/standalone, validación de respuestas.
 * Uso: npx tsx scripts/e2e-chat-battery.ts
 * Requiere backend en http://localhost:3000
 */
import 'dotenv/config';

const API = process.env.API_URL ?? 'http://localhost:3000';
const YEAR = new Date().getFullYear();

type Case = {
  id: string;
  message: string;
  botMode?: 'portfolio' | 'standalone';
  expect?: {
    minLength?: number;
    includes?: RegExp[];
    excludes?: RegExp[];
    httpOk?: boolean;
  };
};

const FAILURE_PHRASES = /inconveniente temporal|error interno|intenta de nuevo en un momento/i;

const cases: Case[] = [
  // ── Perfil / CV (casos que fallaron en prod) ──
  { id: 'perfil-1', message: 'dime su perfil profesional', expect: { includes: [/linkedin|github|CV|cv|Luis/i], excludes: [FAILURE_PHRASES] } },
  { id: 'perfil-2', message: 'pásame el curriculum de Luis', expect: { includes: [/pdf|CV|curriculum|Luis/i], excludes: [FAILURE_PHRASES] } },
  { id: 'perfil-3', message: 'cuales son sus links profesionales?', expect: { includes: [/linkedin|github|portafolio|@/i], excludes: [FAILURE_PHRASES] } },
  { id: 'perfil-4', message: 'como puedo contactar a Luis David?', expect: { includes: [/email|@|contacto|linkedin/i], excludes: [FAILURE_PHRASES] } },
  { id: 'perfil-5', message: 'muéstrame su hoja de vida', expect: { includes: [/Luis|CV|pdf/i], excludes: [FAILURE_PHRASES] } },

  // ── Clima ──
  { id: 'clima-1', message: 'cual es el clima en Medellín', expect: { includes: [/°C|temperatura|Medellín/i], excludes: [FAILURE_PHRASES] } },
  { id: 'clima-2', message: '¿Cómo está el tiempo en Bogotá hoy?', expect: { includes: [/°C|temperatura|Bogotá/i], excludes: [FAILURE_PHRASES] } },
  { id: 'clima-3', message: 'pronostico del clima en Cali para los proximos dias', expect: { includes: [/°C|Cali|pronóstico|pronostico|día/i], excludes: [FAILURE_PHRASES] } },

  // ── Hora / fecha ──
  { id: 'hora-1', message: 'que hora es ahora', expect: { includes: [new RegExp(String(YEAR)), /\d{1,2}:\d{2}|hora/i], excludes: [FAILURE_PHRASES, /\b202[0-4]\b/] } },
  { id: 'hora-2', message: 'en qué fecha estamos', expect: { includes: [new RegExp(String(YEAR))], excludes: [FAILURE_PHRASES, /\b202[0-4]\b/] } },

  // ── Utilidades ──
  { id: 'math-1', message: 'cuanto es 15% de 2400', expect: { includes: [/360/], excludes: [FAILURE_PHRASES] } },
  { id: 'math-2', message: 'calcula la raiz cuadrada de 144', expect: { includes: [/12/], excludes: [FAILURE_PHRASES] } },
  { id: 'crypto-1', message: 'precio de bitcoin', expect: { includes: [/bitcoin|BTC|\$/i], excludes: [FAILURE_PHRASES] } },
  { id: 'divisas-1', message: 'convierte 100 dolares a pesos colombianos', expect: { includes: [/COP|peso|\d/i], excludes: [FAILURE_PHRASES] } },
  { id: 'translate-1', message: 'traduce al ingles: buenos dias como estas', expect: { includes: [/hello|good|how/i], excludes: [FAILURE_PHRASES] } },
  { id: 'password-1', message: 'genera una contraseña segura de 12 caracteres', expect: { minLength: 8, excludes: [FAILURE_PHRASES] } },
  { id: 'qr-1', message: 'genera un codigo QR para https://github.com', expect: { includes: [/qr|QR|http/i], excludes: [FAILURE_PHRASES] } },
  { id: 'recipe-1', message: 'busca receta de arepas', expect: { includes: [/arepa|receta|ingrediente/i], excludes: [FAILURE_PHRASES] } },
  { id: 'trivia-1', message: 'dame una trivia de ciencia facil', expect: { includes: [/A\)|B\)|opcion|opción|\?/i], excludes: [FAILURE_PHRASES] } },
  { id: 'finance-1', message: 'interes compuesto de 1000 dolares al 10% anual por 2 años', expect: { includes: [/\d/, /interés|interes|total|monto/i], excludes: [FAILURE_PHRASES] } },
  { id: 'web-1', message: 'cual es la capital de Francia', expect: { includes: [/París|Paris/i], excludes: [FAILURE_PHRASES] } },

  // ── Carrera ──
  { id: 'roadmap-1', message: 'crea un roadmap de 4 semanas para ser frontend junior', expect: { includes: [/semana|roadmap|frontend/i], excludes: [FAILURE_PHRASES] } },
  { id: 'bullets-1', message: 'genera bullets de CV para: desarrollé app React con 500 usuarios', expect: { includes: [/React|bullet|•|-/i], excludes: [FAILURE_PHRASES] } },
  { id: 'oferta-1', message: 'analiza esta oferta: buscamos React TypeScript Node.js. Mi CV: desarrollador con React y Express', expect: { includes: [/React|Luis|contacto|coincid/i], excludes: [/no cumple|no encaja/i, FAILURE_PHRASES] } },
  { id: 'entrevista-1', message: 'inicia una entrevista tecnica de frontend junior', expect: { includes: [/pregunta|entrevista|frontend/i], excludes: [FAILURE_PHRASES] } },

  // ── Portfolio mode ──
  { id: 'wa-portfolio', message: 'quiero escribirle por whatsapp', botMode: 'portfolio', expect: { includes: [/wa\.me|whatsapp/i], excludes: [FAILURE_PHRASES] } },
  { id: 'perfil-portfolio', message: 'soy reclutador, necesito su CV', botMode: 'portfolio', expect: { includes: [/CV|pdf|Luis/i], excludes: [FAILURE_PHRASES] } },

  // ── Standalone: sin WhatsApp tool ──
  { id: 'wa-standalone', message: 'dame el whatsapp de luis', botMode: 'standalone', expect: { excludes: [FAILURE_PHRASES] } },
];

type Result = {
  id: string;
  ok: boolean;
  ms: number;
  status: number;
  detail: string;
  answerPreview: string;
};

async function waitForHealth(maxWaitMs = 30_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${API}/health`);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function validateAnswer(answer: string, expect: Case['expect']): string | null {
  if (!expect) return null;
  if (expect.minLength && answer.length < expect.minLength) {
    return `respuesta muy corta (${answer.length} chars)`;
  }
  for (const re of expect.includes ?? []) {
    if (!re.test(answer)) return `no coincide con ${re}`;
  }
  for (const re of expect.excludes ?? []) {
    if (re.test(answer)) return `contiene texto prohibido: ${re}`;
  }
  return null;
}

async function runCase(testCase: Case): Promise<Result> {
  const t0 = Date.now();
  const sessionId = `e2e-${testCase.id}-${Date.now()}`;
  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({
        message: testCase.message,
        botMode: testCase.botMode ?? 'standalone',
      }),
    });
    const ms = Date.now() - t0;
    const data = (await res.json()) as { answer?: string; error?: string; details?: string };

    if (!res.ok) {
      return {
        id: testCase.id,
        ok: false,
        ms,
        status: res.status,
        detail: data.error ?? data.details ?? `HTTP ${res.status}`,
        answerPreview: '',
      };
    }

    const answer = data.answer ?? '';
    const validationError = validateAnswer(answer, testCase.expect);
    if (validationError) {
      return {
        id: testCase.id,
        ok: false,
        ms,
        status: res.status,
        detail: validationError,
        answerPreview: answer.slice(0, 120).replace(/\s+/g, ' '),
      };
    }

    if (answer.length < 5) {
      return {
        id: testCase.id,
        ok: false,
        ms,
        status: res.status,
        detail: 'respuesta vacía o demasiado corta',
        answerPreview: answer,
      };
    }

    return {
      id: testCase.id,
      ok: true,
      ms,
      status: res.status,
      detail: 'OK',
      answerPreview: answer.slice(0, 100).replace(/\s+/g, ' '),
    };
  } catch (err) {
    return {
      id: testCase.id,
      ok: false,
      ms: Date.now() - t0,
      status: 0,
      detail: err instanceof Error ? err.message : String(err),
      answerPreview: '',
    };
  }
}

async function main() {
  console.log(`\n🔍 E2E Chat Battery — ${API}\n`);

  const healthy = await waitForHealth();
  if (!healthy) {
    console.error('❌ Backend no responde en /health. Inicia con: npm run dev');
    process.exit(1);
  }
  console.log('✅ Backend disponible\n');

  const results: Result[] = [];
  for (const testCase of cases) {
    const result = await runCase(testCase);
    results.push(result);
    const icon = result.ok ? '✅' : '❌';
    console.log(`${icon} ${result.id} (${result.ms}ms) — ${result.detail}`);
    if (!result.ok && result.answerPreview) {
      console.log(`   → ${result.answerPreview}…`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  const passed = results.length - failed.length;
  console.log(`\n=== RESUMEN: ${passed}/${results.length} OK ===`);
  if (failed.length) {
    console.log('\nFallos:');
    for (const f of failed) {
      console.log(`  - ${f.id}: ${f.detail}`);
    }
    process.exit(1);
  }
}

main();
