import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
}

// Express 5 recognizes error middleware by arity, so the unused `next`
// parameter below is required even though it's never called.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', issues: err.issues })
    return
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
