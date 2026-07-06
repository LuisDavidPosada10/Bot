import { Router } from 'express';
import { ensureEnv } from '../config/env.js';
import { getMongoStatus, isMongoEnabled } from '../db/connection.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('healthRouter');
const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const missing = ensureEnv();
  const isHealthy = missing.length === 0;
  const mongo = getMongoStatus();

  if (isHealthy) {
    logger.info({ mongo }, 'Health check exitoso');
  } else {
    logger.warn({ missingEnv: missing, mongo }, 'Health check: variables faltantes');
  }

  res.json({
    ok: isHealthy,
    missingEnv: missing,
    mongo: {
      enabled: isMongoEnabled(),
      status: mongo,
    },
  });
});

export default healthRouter;
