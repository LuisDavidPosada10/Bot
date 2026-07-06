import { BaseMessage } from '@langchain/core/messages';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('l1SessionStore');

export const TTL_MS = 60 * 60 * 1000;
export const MAX_MSGS = 8;

type SessionEntry = {
  messages: BaseMessage[];
  updatedAt: number;
};

const store = new Map<string, SessionEntry>();
let onExpire: ((sessionId: string) => void) | undefined;

export function setL1ExpireHandler(handler: (sessionId: string) => void): void {
  onExpire = handler;
}

function prune() {
  const now = Date.now();
  let prunedCount = 0;
  for (const [sessionId, entry] of store.entries()) {
    if (now - entry.updatedAt > TTL_MS) {
      onExpire?.(sessionId);
      store.delete(sessionId);
      prunedCount++;
    }
  }
  if (prunedCount > 0) {
    logger.debug({ prunedCount, remainingSessions: store.size }, 'Sesiones L1 expiradas');
  }
}

export function l1Has(sessionId: string): boolean {
  prune();
  return store.has(sessionId);
}

export function l1Get(sessionId: string): BaseMessage[] {
  prune();
  return store.get(sessionId)?.messages ?? [];
}

export function l1Set(sessionId: string, messages: BaseMessage[]): BaseMessage[] {
  prune();
  const clipped =
    messages.length > MAX_MSGS ? messages.slice(messages.length - MAX_MSGS) : messages;
  store.set(sessionId, { messages: clipped, updatedAt: Date.now() });
  logger.debug({ sessionId, messageCount: clipped.length, totalSessions: store.size }, 'L1 actualizado');
  return clipped;
}

export function l1Delete(sessionId: string): void {
  store.delete(sessionId);
}

export function l1GetAllSessionIds(): string[] {
  prune();
  return [...store.keys()];
}

/** Solo para tests — reinicia el store en memoria. */
export function resetL1StoreForTests(): void {
  store.clear();
  onExpire = undefined;
}
