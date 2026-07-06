import { HumanMessage } from '@langchain/core/messages';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/connection.js', () => ({
  isMongoEnabled: vi.fn(() => true),
  getMongoStatus: vi.fn(() => 'connected'),
}));

const loadSessionFromMongo = vi.fn();
const saveSessionToMongo = vi.fn();

vi.mock('./mongoSessionStore.js', () => ({
  loadSessionFromMongo: (...args: unknown[]) => loadSessionFromMongo(...args),
  saveSessionToMongo: (...args: unknown[]) => saveSessionToMongo(...args),
}));

import {
  flushSession,
  getMessages,
  resetHybridStoreForTests,
  setMessages,
} from './hybridSessionStore.js';

describe('hybridSessionStore', () => {
  beforeEach(() => {
    resetHybridStoreForTests();
    loadSessionFromMongo.mockReset();
    saveSessionToMongo.mockReset();
    saveSessionToMongo.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads from L1 without hitting Mongo on cache hit', async () => {
    setMessages('s1', [new HumanMessage('local')]);
    const messages = await getMessages('s1');

    expect(messages).toHaveLength(1);
    expect(loadSessionFromMongo).not.toHaveBeenCalled();
  });

  it('hydrates L1 from Mongo on cache miss', async () => {
    loadSessionFromMongo.mockResolvedValueOnce([new HumanMessage('desde mongo')]);
    const messages = await getMessages('s2');

    expect(loadSessionFromMongo).toHaveBeenCalledWith('s2');
    expect(messages).toHaveLength(1);
    expect((messages[0] as HumanMessage).content).toBe('desde mongo');
  });

  it('flushes to Mongo after SYNC_EVERY_N_MESSAGES writes', async () => {
    for (let i = 0; i < 5; i++) {
      setMessages('s3', [new HumanMessage(`msg-${i}`)]);
    }

    await vi.runAllTimersAsync();
    await flushSession('s3');

    expect(saveSessionToMongo).toHaveBeenCalled();
    const [sessionId, messages] = saveSessionToMongo.mock.calls.at(-1) ?? [];
    expect(sessionId).toBe('s3');
    expect(messages.length).toBeGreaterThan(0);
  });
});
