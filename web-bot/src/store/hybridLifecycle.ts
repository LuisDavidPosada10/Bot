import { flushAllSessions } from './hybridSessionStore.js';

let registered = false;

export function registerHybridStoreLifecycle(): void {
  if (registered) return;
  registered = true;

  process.on('beforeExit', () => {
    void flushAllSessions();
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void flushAllSessions().finally(() => process.exit(0));
    });
  }
}
