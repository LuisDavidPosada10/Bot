import { BaseMessage } from '@langchain/core/messages';
import { SYNC_DEBOUNCE_MS, SYNC_EVERY_N_MESSAGES } from '../config/env.js';
import { isMongoEnabled } from '../db/connection.js';
import { getLogger } from '../utils/logger.js';
import {
  l1Get,
  l1GetAllSessionIds,
  l1Has,
  l1Set,
  resetL1StoreForTests,
  setL1ExpireHandler,
} from './l1SessionStore.js';
import { loadSessionFromMongo, saveSessionToMongo } from './mongoSessionStore.js';

const logger = getLogger('hybridSessionStore');

const hydratedFromMongo = new Set<string>();
const dirtySessions = new Set<string>();
const messagesSinceSync = new Map<string, number>();
const debounceTimers = new Map<string, NodeJS.Timeout>();
const flushInFlight = new Set<string>();

export async function getMessages(sessionId?: string): Promise<BaseMessage[]> {
  if (!sessionId) return [];

  if (l1Has(sessionId)) {
    return l1Get(sessionId);
  }

  if (hydratedFromMongo.has(sessionId)) {
    return l1Get(sessionId);
  }

  if (isMongoEnabled()) {
    const fromMongo = await loadSessionFromMongo(sessionId);
    hydratedFromMongo.add(sessionId);
    if (fromMongo.length > 0) {
      l1Set(sessionId, fromMongo);
      return fromMongo;
    }
  }

  hydratedFromMongo.add(sessionId);
  return [];
}

export function setMessages(sessionId: string | undefined, messages: BaseMessage[]): void {
  if (!sessionId) return;

  const clipped = l1Set(sessionId, messages);
  markDirty(sessionId, clipped.length);
}

function markDirty(sessionId: string, messageCount: number): void {
  if (!isMongoEnabled()) return;

  dirtySessions.add(sessionId);
  const pending = (messagesSinceSync.get(sessionId) ?? 0) + 1;
  messagesSinceSync.set(sessionId, pending);

  if (pending >= SYNC_EVERY_N_MESSAGES) {
    void flushSession(sessionId, messageCount);
    return;
  }

  const existingTimer = debounceTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  debounceTimers.set(
    sessionId,
    setTimeout(() => {
      debounceTimers.delete(sessionId);
      void flushSession(sessionId, messageCount);
    }, SYNC_DEBOUNCE_MS)
  );
}

export async function flushSession(sessionId: string, messageCount?: number): Promise<void> {
  if (!isMongoEnabled() || !dirtySessions.has(sessionId) || flushInFlight.has(sessionId)) {
    return;
  }

  flushInFlight.add(sessionId);
  const timer = debounceTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(sessionId);
  }

  try {
    const messages = l1Get(sessionId);
    const count = messageCount ?? messages.length;
    await saveSessionToMongo(sessionId, messages, count);
    dirtySessions.delete(sessionId);
    messagesSinceSync.set(sessionId, 0);
    logger.debug({ sessionId, messageCount: count }, 'Flush L1 → Mongo completado');
  } finally {
    flushInFlight.delete(sessionId);
  }
}

export async function flushAllSessions(): Promise<void> {
  const sessionIds = new Set<string>([
    ...l1GetAllSessionIds(),
    ...dirtySessions,
  ]);

  await Promise.all([...sessionIds].map((sessionId) => flushSession(sessionId)));
}

export function onL1SessionExpired(sessionId: string): void {
  void flushSession(sessionId);
  hydratedFromMongo.delete(sessionId);
}

setL1ExpireHandler((sessionId) => {
  onL1SessionExpired(sessionId);
});

/** Solo para tests — reinicia estado del store híbrido. */
export function resetHybridStoreForTests(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  dirtySessions.clear();
  messagesSinceSync.clear();
  flushInFlight.clear();
  hydratedFromMongo.clear();
  resetL1StoreForTests();
  setL1ExpireHandler((sessionId) => {
    onL1SessionExpired(sessionId);
  });
}
