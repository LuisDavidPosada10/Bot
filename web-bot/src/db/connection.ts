import mongoose from 'mongoose';
import { MONGODB_URI } from '../config/env.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('mongoConnection');

let connectPromise: Promise<typeof mongoose> | null = null;

export function isMongoEnabled(): boolean {
  return Boolean(MONGODB_URI?.trim());
}

export async function connectDatabase(): Promise<boolean> {
  if (!isMongoEnabled()) {
    logger.info('MONGODB_URI no configurada — persistencia desactivada (solo memoria L1)');
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(MONGODB_URI!, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    await connectPromise;
    logger.info('MongoDB conectado');
    return true;
  } catch (error) {
    connectPromise = null;
    logger.error({ error }, 'No se pudo conectar a MongoDB — usando solo memoria L1');
    return false;
  }
}

export function getMongoStatus(): 'connected' | 'disabled' | 'error' {
  if (!isMongoEnabled()) return 'disabled';
  if (mongoose.connection.readyState === 1) return 'connected';
  return 'error';
}
