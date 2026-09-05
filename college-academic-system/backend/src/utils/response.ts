import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): Response<ApiSuccess<T>> {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendFailure(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown,
): Response<ApiFailure> {
  const body: ApiFailure = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(statusCode).json(body);
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
