import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('sessionMiddleware');
export const SESSION_COOKIE_NAME = 'webbot_sid';

function parseCookie(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > -1) {
      const k = p.slice(0, idx).trim();
      const v = p.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookie(req.headers.cookie);
  let sid =
    (cookies[SESSION_COOKIE_NAME] as string | undefined) ||
    (req.headers['x-session-id'] as string | undefined);
  if (!sid || typeof sid !== 'string' || sid.length < 8) {
    sid = crypto.randomUUID();
    logger.debug({ sessionId: sid }, 'Nueva sesión creada');
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax`
    );
  } else {
    logger.debug({ sessionId: sid }, 'Sesión existente reutilizada');
  }
  (req as any).sessionId = sid;
  next();
}
