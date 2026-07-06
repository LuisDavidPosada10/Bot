import { getMongoStatus, isMongoEnabled } from '../db/connection.js';
import { UserModel, type UserType } from '../db/models/user.model.js';
import type { ToolResult } from '../agent/miniAgent.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('userProfile');

const RECRUITER_PATTERNS =
  /\b(reclutador|recruiter|talent|vacante|vacancy|hiring|contrat(ar|o)|oferta de trabajo|job offer|job description|jd\b|headhunter|rrhh|human resources|quiero contratar|buscamos desarrollador)\b/i;

const DEVELOPER_PATTERNS =
  /\b(como funciona|arquitectura|stack técnico|código fuente|github|implementación|mongodb|langchain|vitest|api rest)\b/i;

function inferUserType(message: string, tools: string[]): UserType {
  if (tools.includes('enviar_contacto') || tools.includes('analizar_oferta')) return 'recruiter';
  if (RECRUITER_PATTERNS.test(message)) return 'recruiter';
  if (DEVELOPER_PATTERNS.test(message) || tools.includes('entrevista_tecnica')) return 'developer';
  if (/\b(estudiante|student|aprendiendo|junior buscando)\b/i.test(message)) return 'student';
  return 'unknown';
}

export async function trackUserActivity(params: {
  sessionId?: string;
  message: string;
  toolResults: ToolResult[];
  cvUploaded?: boolean;
}): Promise<void> {
  const { sessionId, message, toolResults, cvUploaded } = params;
  if (!sessionId || !isMongoEnabled() || getMongoStatus() !== 'connected') return;

  const toolNames = toolResults.map((t) => t.name);
  const userType = inferUserType(message, toolNames);
  const now = new Date();

  try {
    const update: Record<string, unknown> = {
      $set: { lastSeen: now, updatedAt: now },
      $setOnInsert: { firstSeen: now, sessionId },
      $inc: { messageCount: 1 },
      $addToSet: { toolsUsed: { $each: toolNames } },
    };

    if (userType !== 'unknown') {
      (update.$set as Record<string, unknown>).userType = userType;
    }
    if (cvUploaded) {
      (update.$set as Record<string, unknown>).cvUploaded = true;
    }

    await UserModel.findOneAndUpdate({ sessionId }, update, { upsert: true });
    logger.debug({ sessionId, userType, tools: toolNames.length }, 'Perfil de usuario actualizado');
  } catch (err) {
    logger.error({ err, sessionId }, 'Error al actualizar perfil de usuario');
  }
}
