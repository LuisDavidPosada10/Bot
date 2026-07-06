import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const processChat = vi.fn();

vi.mock('../services/chatService.js', () => ({
  processChat: (...args: unknown[]) => processChat(...args),
}));

vi.mock('../db/connection.js', () => ({
  connectDatabase: vi.fn().mockResolvedValue(false),
  isMongoEnabled: vi.fn(() => false),
  getMongoStatus: vi.fn(() => 'disabled'),
}));

import { createApp } from '../app.js';

describe('GET /health', () => {
  const app = createApp();

  it('returns health payload', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.mongo).toEqual({ enabled: false, status: 'disabled' });
    expect(Array.isArray(res.body.missingEnv)).toBe(true);
  });
});

describe('POST /chat', () => {
  const app = createApp();

  afterEach(() => {
    processChat.mockReset();
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('message');
    expect(processChat).not.toHaveBeenCalled();
  });

  it('returns agent response and session id', async () => {
    processChat.mockResolvedValueOnce({
      answer: 'Respuesta de prueba',
      toolResults: [{ name: 'hora_actual', args: {}, output: 'now' }],
      messages: [],
    });

    const res = await request(app).post('/chat').send({ message: 'hola' });

    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('Respuesta de prueba');
    expect(res.body.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(processChat).toHaveBeenCalledOnce();
  });
});
