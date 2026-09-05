import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { corsOrigins, env, isProd } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';
import { uploadDir } from './middleware/upload';
import { sendSuccess } from './utils/response';

export function createApp() {
  const app = express();

  // Behind a proxy in production, so rate limiting sees the real client IP.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Uploaded files are served from this origin and embedded by the SPA.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  if (!isProd) app.use(morgan('dev'));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please slow down.' },
    }),
  );

  app.get('/api/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', uptime: process.uptime(), env: env.NODE_ENV });
  });

  app.use('/uploads', express.static(uploadDir, { maxAge: '1h', index: false }));
  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const staticRoot = path.resolve(process.cwd(), 'public');
