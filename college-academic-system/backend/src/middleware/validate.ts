import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError } from '../utils/apiError';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function fieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Validates and *replaces* the request parts with the parsed values, so
 * downstream handlers get coerced types (numbers, dates) rather than strings.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsedQuery, writable: true, configurable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(ApiError.unprocessable('Please correct the highlighted fields.', fieldErrors(err)));
        return;
      }
      next(err);
    }
  };
}
