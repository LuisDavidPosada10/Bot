import { getToolsForMode, type BotMode } from '../tools/index.js';
import { runAgent } from '../agent/miniAgent.js';
import { trackUserActivity } from './userProfileService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('chatService');

type Params = {
  message: string;
  sessionId?: string;
  file?: Express.Multer.File;
  botMode?: BotMode;
};

export async function processChat({ message, sessionId, file, botMode = 'standalone' }: Params) {
  let contextText: string | undefined;
  if (file && file.mimetype === 'application/pdf') {
    try {
      logger.debug({ fileName: file.originalname, fileSize: file.size }, 'Procesando PDF');
      const pdf = (await import('pdf-parse')).default as any;
      const data = await pdf(file.buffer as any);
      const cvText: string = (data as any)?.text ?? '';
      if (cvText && cvText.trim().length > 10) {
        contextText = 'PDF adjunto detectado. Texto extraído:\n' + cvText.slice(0, 15000);
        logger.debug({ extractedLength: cvText.length }, 'PDF procesado exitosamente');
      }
    } catch (err: any) {
      logger.warn({ err }, 'Error al procesar PDF, continuando sin contexto');
    }
  }
  const tools = getToolsForMode(botMode);
  const result = await runAgent(message, tools as any[], sessionId, contextText, botMode);

  trackUserActivity({
    sessionId,
    message,
    toolResults: result.toolResults,
    cvUploaded: !!file,
  }).catch(() => {});

  return result;
}
