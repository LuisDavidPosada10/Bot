import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE_NAME, sessionMiddleware } from './session.js';

function createMockRes() {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: vi.fn((key: string, value: string) => {
      headers[key.toLowerCase()] = value;
    }),
  } as unknown as Response;
}

describe('sessionMiddleware', () => {
  it('creates a new session cookie when none exists', () => {
    const req = { headers: {} } as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    sessionMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as any).sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(`${SESSION_COOKIE_NAME}=`)
    );
  });

  it('reuses session id from cookie', () => {
    const req = {
      headers: { cookie: `${SESSION_COOKIE_NAME}=abc12345-0000-4000-8000-000000000000` },
    } as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    sessionMiddleware(req, res, next);

    expect((req as any).sessionId).toBe('abc12345-0000-4000-8000-000000000000');
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('accepts x-session-id header', () => {
    const req = {
      headers: { 'x-session-id': 'header-session-id-12345678' },
    } as unknown as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    sessionMiddleware(req, res, next);

    expect((req as any).sessionId).toBe('header-session-id-12345678');
  });
});
