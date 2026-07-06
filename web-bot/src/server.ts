import logger from './utils/logger.js';
import { ensureEnv, PORT, FORMSPREE_ENDPOINT } from './config/env.js';
import { connectDatabase } from './db/connection.js';
import { createApp } from './app.js';
import { registerHybridStoreLifecycle } from './store/hybridLifecycle.js';

const missingEnvVars = ensureEnv();
if (missingEnvVars.length > 0) {
  logger.warn({ missing: missingEnvVars }, 'Variables de entorno faltantes — algunas funciones podrían no funcionar');
}

const app = createApp();

async function start() {
  await connectDatabase();
  registerHybridStoreLifecycle();
  app.listen(PORT, () => {
    logger.info(`Servidor escuchando en puerto ${PORT}`);
    logger.info(
      { formspree: !!FORMSPREE_ENDPOINT },
      FORMSPREE_ENDPOINT ? 'Formspree configurado' : 'Formspree NO configurado — enviar_contacto fallará'
    );
  });
}

void start();
