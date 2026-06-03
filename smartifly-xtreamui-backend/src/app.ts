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
      // LG webOS packaged apps call the backend from file:// and still need to read
      // cross-origin JSON responses. Helmet's default CORP header can cause the
      // browser to reject the response even when the request reaches Express.
      crossOriginResourcePolicy: false,
    })
  );

  // CORS
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser/server-to-server requests with no Origin header.
        if (!origin) return callback(null, true);

        // LG webOS packaged apps loaded from file:// can send either Origin: null
        // or a file:// app identifier such as file://com.smartifly.lg-webos.
        if (origin === 'null' || origin.startsWith('file://')) {
          return callback(null, true);
        }

        if (corsOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  // Some embedded webOS fetch implementations still reject responses from file:// apps
  // unless explicit permissive CORS headers are present on the response itself.
  app.use((req, res, next) => {
    if (
      req.path === '/health' ||
      req.path === '/v1/public/portal/validate' ||
      req.path === '/v1/public/xtream/login'
    ) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');

      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
    }

    next();
  });

  // BODY PARSING
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Targeted request logging for LG onboarding diagnostics.
  app.use((req, _res, next) => {
    if (
      req.path === '/health' ||
      req.path === '/v1/public/portal/validate' ||
      req.path === '/v1/public/xtream/login'
    ) {
      console.log(
        `[LG-DIAG] ${new Date().toISOString()} ${req.method} ${req.path} origin=${req.headers.origin ?? '(none)'}`
      );
    }
    next();
  });

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
