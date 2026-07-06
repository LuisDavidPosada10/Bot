import express from 'express';
import pinoHttpPkg from 'pino-http';
import logger from './utils/logger.js';
import { ALLOWED_ORIGIN } from './config/env.js';
import healthRouter from './routes/healthRouter.js';
import chatRouter from './routes/chatRouter.js';
import { sessionMiddleware } from './middlewares/session.js';

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = ALLOWED_ORIGIN ? ALLOWED_ORIGIN.split(',').map((o) => o.trim()) : [];
    if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else if (!ALLOWED_ORIGIN) {
      res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());
  const pinoHttp = (pinoHttpPkg as any).default ?? (pinoHttpPkg as any);
  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
      customLogLevel: function (res: any, err: any) {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  app.use(sessionMiddleware);
  app.use(healthRouter);
  app.use(chatRouter);

  return app;
}
