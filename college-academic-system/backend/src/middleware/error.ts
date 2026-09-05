import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../utils/apiError';
import { sendFailure } from '../utils/response';
import { isProd } from '../config/env';

export const notFoundHandler: RequestHandler = (req, res) => {
  sendFailure(res, `No route matches ${req.method} ${req.originalUrl}`, 404);
};

/**
 * Single place where every failure becomes an API response.
 * Unknown errors are logged in full but reported generically.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    sendFailure(res, err.message, err.statusCode, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    sendFailure(res, 'Please correct the highlighted fields.', 422, errors);
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'The uploaded file is too large.'
        : `Upload failed: ${err.message}`;
    sendFailure(res, message, 400);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(', ')
        : 'field';
      sendFailure(res, `A record with this ${target} already exists.`, 409);
      return;
    }
    if (err.code === 'P2025') {
      sendFailure(res, 'The requested record no longer exists.', 404);
      return;
    }
    if (err.code === 'P2003') {
      sendFailure(res, 'This record is referenced by other data and cannot be changed.', 409);
      return;
    }
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  sendFailure(
    res,
    'Something went wrong',
    500,
    isProd ? undefined : { detail: err instanceof Error ? err.message : String(err) },
  );
};
