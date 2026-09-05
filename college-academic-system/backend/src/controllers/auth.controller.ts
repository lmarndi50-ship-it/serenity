import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/response';
import { requireUser } from '../middleware/auth';
import {
  issueRefreshToken,
  revokeAllForUser,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../services/token.service';
import { isProd } from '../config/env';

const REFRESH_COOKIE = 'cams_refresh';
const BCRYPT_ROUNDS = 12;

function refreshCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: maxAgeMs,
  };
}

/** Shape returned to the client. Never includes the password hash. */
async function buildAuthPayload(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      avatarUrl: true,
      student: {
        select: {
          id: true,
          rollNumber: true,
          registrationNo: true,
          admissionYear: true,
          department: { select: { id: true, name: true, code: true } },
          course: { select: { id: true, name: true, code: true } },
          semester: { select: { id: true, name: true, number: true } },
          section: { select: { id: true, name: true } },
        },
      },
      teacher: {
        select: {
          id: true,
          employeeCode: true,
          designation: true,
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  return user;
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body as {
    identifier: string;
    password: string;
    rememberMe?: boolean;
  };

  const normalised = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalised },
        { student: { rollNumber: { equals: identifier.trim(), mode: 'insensitive' } } },
        { teacher: { employeeCode: { equals: identifier.trim(), mode: 'insensitive' } } },
      ],
    },
    select: { id: true, email: true, role: true, passwordHash: true, isActive: true },
  });

  // Same message for "no such user" and "wrong password" so the endpoint does
  // not confirm which accounts exist.
  const invalid = ApiError.unauthorized('Incorrect email/roll number or password.');
  if (!user) {
    // Equalise timing against the bcrypt compare below.
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw invalid;
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw invalid;

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = await issueRefreshToken(user.id);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip ?? null,
    },
  });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(7 * 24 * 60 * 60 * 1000));

  sendSuccess(res, {
    accessToken,
    refreshToken,
    user: await buildAuthPayload(user.id),
  });
}

export async function register(req: Request, res: Response) {
  const body = req.body as {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    rollNumber: string;
    registrationNo: string;
    admissionYear: number;
    departmentId: string;
    courseId: string;
    semesterId: string;
    sectionId: string;
  };

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw ApiError.conflict('An account with this email address already exists.');

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      role: Role.STUDENT,
      fullName: body.fullName,
      phone: body.phone ?? null,
      student: {
        create: {
          rollNumber: body.rollNumber.toUpperCase(),
          registrationNo: body.registrationNo.toUpperCase(),
          admissionYear: body.admissionYear,
          departmentId: body.departmentId,
          courseId: body.courseId,
          semesterId: body.semesterId,
          sectionId: body.sectionId,
        },
      },
    },
    select: { id: true, email: true, role: true },
  });

  // New students are enrolled into every subject of their semester + section.
  const student = await prisma.student.findUniqueOrThrow({ where: { userId: user.id } });
  const subjects = await prisma.subject.findMany({
    where: { semesterId: body.semesterId, sectionId: body.sectionId },
    select: { id: true },
  });
  if (subjects.length > 0) {
    await prisma.enrollment.createMany({
      data: subjects.map((s) => ({
        studentId: student.id,
        subjectId: s.id,
        semesterId: body.semesterId,
      })),
      skipDuplicates: true,
    });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = await issueRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(7 * 24 * 60 * 60 * 1000));

  sendSuccess(res, { accessToken, refreshToken, user: await buildAuthPayload(user.id) }, 201);
}

export async function refresh(req: Request, res: Response) {
  const token = (req.body?.refreshToken as string | undefined) ?? req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No session to refresh.');

  const { userId, refreshToken } = await rotateRefreshToken(token);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(7 * 24 * 60 * 60 * 1000));

  sendSuccess(res, { accessToken, refreshToken, user: await buildAuthPayload(user.id) });
}

export async function logout(req: Request, res: Response) {
  const token = (req.body?.refreshToken as string | undefined) ?? req.cookies?.[REFRESH_COOKIE];
  if (token) await revokeRefreshToken(token);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  sendSuccess(res, { message: 'Signed out.' });
}

export async function me(req: Request, res: Response) {
  const user = requireUser(req);
  sendSuccess(res, await buildAuthPayload(user.id));
}

export async function changePassword(req: Request, res: Response) {
  const authUser = requireUser(req);
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
    select: { passwordHash: true },
  });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('Your current password is incorrect.');

  await prisma.user.update({
    where: { id: authUser.id },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });

  // Force every other device to sign in again.
  await revokeAllForUser(authUser.id);
  sendSuccess(res, { message: 'Password updated. Please sign in again on your other devices.' });
}

export { BCRYPT_ROUNDS };
