import { describe, expect, it, vi } from 'vitest';

const runAgent = vi.fn();

vi.mock('../agent/miniAgent.js', () => ({
  runAgent: (...args: unknown[]) => runAgent(...args),
}));

import { processChat } from './chatService.js';

describe('processChat', () => {
  it('delegates to runAgent with default tools', async () => {
    runAgent.mockResolvedValueOnce({
      answer: 'ok',
      toolResults: [],
      messages: [],
    });

    const result = await processChat({ message: 'hola', sessionId: 'session-test' });

    expect(runAgent).toHaveBeenCalledWith(
      'hola',
      expect.any(Array),
      'session-test',
      undefined,
      'standalone'
    );
    expect(result.answer).toBe('ok');
  });

  it('passes portfolio mode to runAgent', async () => {
    runAgent.mockResolvedValueOnce({
      answer: 'ok',
      toolResults: [],
      messages: [],
    });

    await processChat({ message: 'cv', sessionId: 's1', botMode: 'portfolio' });

    expect(runAgent).toHaveBeenCalledWith('cv', expect.any(Array), 's1', undefined, 'portfolio');
  });
});
