import 'dotenv/config';

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'llama-3.1-8b-instant';
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
export const PORT = Number(process.env.PORT ?? 3000);
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'no-reply@example.com';
export const FORMSPREE_ENDPOINT = process.env.FORMSPREE_ENDPOINT;
export const PORTFOLIO_URL = process.env.PORTFOLIO_URL ?? 'http://localhost:5173';
export const CONTACT_TO = process.env.CONTACT_TO ?? 'posadaluis451@gmail.com';
/** E.164 sin +, ej. 573001234567 — solo modo portafolio / contactar_whatsapp */
export const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER?.trim() || undefined;
export const SMTP_HOST = process.env.SMTP_HOST;
export const SMTP_PORT = process.env.SMTP_PORT;
export const SMTP_SECURE = process.env.SMTP_SECURE ?? 'false';
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
export const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

export function resolveMongoUri(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = env.MONGODB_URI ?? env.MONGO_URI;
  if (!raw?.trim()) return undefined;

  const dbName = env.MONGO_DB_NAME?.trim();
  if (!dbName) return raw.trim();

  if (/mongodb(\+srv)?:\/\/[^/]+\/[^/?]/.test(raw)) {
    return raw.trim();
  }

  const [base, query] = raw.split('?');
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return query ? `${normalizedBase}${dbName}?${query}` : `${normalizedBase}${dbName}`;
}

function loadMongoUri(): string | undefined {
  return resolveMongoUri(process.env);
}

export const MONGODB_URI = loadMongoUri();
export const SYNC_EVERY_N_MESSAGES = Number(process.env.SYNC_EVERY_N_MESSAGES ?? 5);
export const SYNC_DEBOUNCE_MS = Number(process.env.SYNC_DEBOUNCE_MS ?? 30_000);
export const MONGO_SESSION_TTL_DAYS = Number(process.env.MONGO_SESSION_TTL_DAYS ?? 30);

/** Ventana de historial enviada al LLM (modo standalone) */
export const HISTORY_MAX_TURNS = Number(process.env.HISTORY_MAX_TURNS ?? 2);
export const HISTORY_MAX_TOKENS = Number(process.env.HISTORY_MAX_TOKENS ?? 1200);
/** Ventana más corta para asistente del portafolio */
export const HISTORY_MAX_TURNS_PORTFOLIO = Number(process.env.HISTORY_MAX_TURNS_PORTFOLIO ?? 2);
export const HISTORY_MAX_TOKENS_PORTFOLIO = Number(process.env.HISTORY_MAX_TOKENS_PORTFOLIO ?? 900);

/** Pasos máximos del agente (cada paso = otra llamada al LLM con más contexto) */
export const AGENT_MAX_STEPS = Number(process.env.AGENT_MAX_STEPS ?? 3);

export function ensureEnv(): string[] {
  const missing: string[] = [];
  if (!OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  return missing;
}
