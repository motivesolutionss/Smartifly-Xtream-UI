// ============================================================
// src/app.ts
// Tommy's 100/100 Express Application
// ============================================================

import cors from 'cors';
import type { Application } from 'express';
import express from 'express';
import helmet from 'helmet';

import { registerRoutes } from './routes';

// Workers (Disabled for Purification)
// export { FraudWorker } from './workers/fraudWorker';
// export { CleanupWorker } from './workers/cleanupWorker';

export function createApp(): Application {
  const app = express();

  // SECURITY
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  // CORS
  const configuredOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:3000'];

  const allowedOrigins = new Set(configuredOrigins);

  const isAllowedOrigin = (origin: string): boolean => {
    if (allowedOrigins.has(origin)) return true;
    if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return true;
    if (/^https:\/\/([a-z0-9-]+\.)?smartifly\.co$/i.test(origin)) return true;
    return false;
  };

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || origin === 'null') {
        return callback(null, true);
      }
      // LG webOS packaged apps loaded from file:// can send either Origin: null
      // or a file:// app identifier such as file://com.smartifly.lg-webos.
      if (origin === 'null' || origin.startsWith('file://')) {
          return callback(null, true);
      }
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));

  // BODY PARSING
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // DEV LOGGING
  if (process.env.NODE_ENV === 'development') {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // SIMPLE HEALTH (no prefix)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // STATIC FILES (Dashboard, Assets)
  app.use(express.static('public'));

  // ✅ Single source of truth for all API routes
  registerRoutes(app);

  // 404 HANDLER
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
    });
  });

  // ERROR HANDLER
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[App] Unhandled error:', err);

      const message =
        process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message,
      });
    }
  );

  return app;
}

export default createApp;
