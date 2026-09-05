import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/apiError';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please sign in again.');
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiryDate(): Date {
  // Mirrors JWT_REFRESH_EXPIRES_IN so the DB row and the JWT expire together.
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const ms = match ? Number(match[1]) * unitMs[match[2]] : 7 * 86_400_000;
  return new Date(Date.now() + ms);
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = jwt.sign({ sub: userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);

  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(token), userId, expiresAt: refreshExpiryDate() },
  });

  return token;
}

/**
 * Validates a refresh token against both its signature and the database row,
 * then rotates it: the presented token is revoked and a new one is issued.
 */
export async function rotateRefreshToken(
  token: string,
): Promise<{ userId: string; refreshToken: string }> {
  let decoded: { sub?: string };
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub?: string };
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }
  if (!decoded.sub || decoded.sub !== stored.userId) {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const refreshToken = await issueRefreshToken(stored.userId);
  return { userId: stored.userId, refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
