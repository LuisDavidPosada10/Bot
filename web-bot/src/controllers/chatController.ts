import { Request, Response } from 'express';
import { OPENAI_API_KEY } from '../config/env.js';
import { processChat } from '../services/chatService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('chatController');

export async function handleChat(req: Request, res: Response) {
  try {
    const { message, botMode: rawMode } = (req.body ?? {}) as {
      message?: string;
      sessionId?: string;
      botMode?: string;
    };
    const botMode = rawMode === 'portfolio' ? 'portfolio' : 'standalone';
    if (!message || typeof message !== 'string') {
      logger.warn({ message, type: typeof message }, 'Mensaje inválido recibido');
      return res.status(400).json({ error: 'message es requerido y debe ser string' });
    }
    if (!OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY no configurada');
      return res.status(400).json({
        error: 'Falta OPENAI_API_KEY en variables de entorno',
      });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    const sessionId = (req as any).sessionId as string | undefined;
    
    logger.debug({ sessionId, hasFile: !!file, messageLength: message.length, botMode }, 'Procesando chat');
    
    const result = await processChat({ message, sessionId, file, botMode });
    return res.json({
      answer: result.answer,
      sessionId,
    });
  } catch (err: any) {
    logger.error({ err }, 'Error en /chat');
    return res.status(500).json({ error: 'Error interno', details: err?.message });
  }
}
