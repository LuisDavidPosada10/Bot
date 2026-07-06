import { BaseMessage } from '@langchain/core/messages';
import { MONGO_SESSION_TTL_DAYS } from '../config/env.js';
import { getMongoStatus, isMongoEnabled } from '../db/connection.js';
import { SessionModel } from '../db/models/session.model.js';
import { UserModel } from '../db/models/user.model.js';
import { deserializeMessages, serializeMessages } from './messageCodec.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('mongoSessionStore');

function sessionExpiresAt(): Date {
  const days = MONGO_SESSION_TTL_DAYS > 0 ? MONGO_SESSION_TTL_DAYS : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function loadSessionFromMongo(sessionId: string): Promise<BaseMessage[]> {
  if (!isMongoEnabled() || getMongoStatus() !== 'connected') {
    return [];
  }

  try {
    const doc = await SessionModel.findOne({ sessionId }).lean();
    if (!doc?.messages?.length) {
      return [];
    }
    logger.debug({ sessionId, messageCount: doc.messages.length }, 'Sesión cargada desde MongoDB');
    return deserializeMessages(doc.messages);
  } catch (error) {
    logger.error({ error, sessionId }, 'Error al cargar sesión desde MongoDB');
    return [];
  }
}

export async function saveSessionToMongo(
  sessionId: string,
  messages: BaseMessage[],
  messageCount: number
): Promise<void> {
  if (!isMongoEnabled() || getMongoStatus() !== 'connected') {
    return;
  }

  const now = new Date();
  const serialized = serializeMessages(messages);

  try {
    await SessionModel.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        messages: serialized,
        messageCount,
        updatedAt: now,
        expiresAt: sessionExpiresAt(),
      },
      { upsert: true, new: true }
    );

    await UserModel.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: { firstSeen: now, sessionId },
        $set: { lastSeen: now, updatedAt: now },
        $max: { messageCount },
      },
      { upsert: true, new: true }
    );

    logger.debug({ sessionId, messageCount: serialized.length }, 'Sesión sincronizada a MongoDB');
  } catch (error) {
    logger.error({ error, sessionId }, 'Error al guardar sesión en MongoDB');
  }
}
