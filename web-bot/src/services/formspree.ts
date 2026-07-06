import axios from 'axios';
import { FORMSPREE_ENDPOINT } from '../config/env.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('formspree');

export type FormspreePayload = {
  name: string;
  email: string;
  message: string;
  _subject?: string;
  _replyto?: string;
  company?: string;
  role?: string;
  matchScore?: string;
  source?: string;
};

export async function sendViaFormspree(
  payload: FormspreePayload
): Promise<{ ok: true } | { error: string; message: string }> {
  if (!FORMSPREE_ENDPOINT) {
    return {
      error: 'CONFIG_MISSING',
      message: 'Falta FORMSPREE_ENDPOINT en el entorno del servidor',
    };
  }

  try {
    logger.debug({ to: payload.email, company: payload.company }, 'Enviando vía Formspree');
    const { data, status } = await axios.post(
      FORMSPREE_ENDPOINT,
      {
        ...payload,
        source: payload.source ?? 'web-bot',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 10_000,
      }
    );

    if (status >= 200 && status < 300) {
      logger.info({ company: payload.company, role: payload.role }, 'Formspree enviado');
      return { ok: true };
    }

    return {
      error: 'DELIVERY_FAILED',
      message: (data as { error?: string })?.error ?? `HTTP ${status}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Error al enviar Formspree');
    return { error: 'DELIVERY_FAILED', message };
  }
}
