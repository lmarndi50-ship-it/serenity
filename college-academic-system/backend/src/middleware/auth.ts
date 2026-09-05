import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { prisma } from '../utils/prisma';
import { verifyAccessToken } from '../services/token.service';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  studentId?: string;
  teacherId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Rejects the request unless a valid access token maps to an active user. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized();

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        student: { select: { id: true } },
        teacher: { select: { id: true } },
      },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('This account is no longer active.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      studentId: user.student?.id,
      teacherId: user.teacher?.id,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Restricts a route to one or more roles. Must run after `authenticate`. */
export function authorize(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires one of: ${roles.join(', ')}.`));
    }
    next();
  };
}

/** Convenience accessor that narrows the optional `req.user`. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export function requireStudentId(req: Request): string {
  const user = requireUser(req);
  if (!user.studentId) throw ApiError.forbidden('No student profile is linked to this account.');
  return user.studentId;
}

export function requireTeacherId(req: Request): string {
  const user = requireUser(req);
  if (!user.teacherId) throw ApiError.forbidden('No teacher profile is linked to this account.');
  return user.teacherId;
}
