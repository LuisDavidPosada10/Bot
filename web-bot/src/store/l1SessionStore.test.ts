import { HumanMessage } from '@langchain/core/messages';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  l1Get,
  l1Has,
  l1Set,
  MAX_MSGS,
  resetL1StoreForTests,
  TTL_MS,
} from './l1SessionStore.js';

describe('l1SessionStore', () => {
  beforeEach(() => {
    resetL1StoreForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves messages for a session', () => {
    l1Set('session-1', [new HumanMessage('hola')]);
    expect(l1Has('session-1')).toBe(true);
    expect(l1Get('session-1')).toHaveLength(1);
  });

  it('clips history to MAX_MSGS', () => {
    const messages = Array.from({ length: MAX_MSGS + 5 }, (_, i) => new HumanMessage(`m${i}`));
    l1Set('session-clip', messages);
    expect(l1Get('session-clip')).toHaveLength(MAX_MSGS);
    expect((l1Get('session-clip')[0] as HumanMessage).content).toBe('m5');
  });

  it('expires sessions after TTL', () => {
    l1Set('session-expire', [new HumanMessage('temporal')]);
    vi.advanceTimersByTime(TTL_MS + 1);
    expect(l1Has('session-expire')).toBe(false);
    expect(l1Get('session-expire')).toEqual([]);
  });
});
