import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/response';
import { getSettings } from '../services/settings.service';

/**
 * Reference lists used by every filter dropdown in the app.
 * Public (no auth) only for the registration form's needs — see routes.
 */
export async function getReferenceData(_req: Request, res: Response) {
  const [departments, courses, semesters, sections, sessions, settings] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.course.findMany({
      include: { department: { select: { name: true, code: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.semester.findMany({
      include: { session: { select: { name: true } } },
      orderBy: { number: 'asc' },
    }),
    prisma.section.findMany({ orderBy: { name: 'asc' } }),
    prisma.academicSession.findMany({ orderBy: { startDate: 'desc' } }),
    getSettings(),
  ]);

  sendSuccess(res, {
    departments,
    courses,
    semesters,
    sections,
    sessions,
    collegeName: settings.collegeName,
    thresholds: settings.thresholds,
    weights: settings.weights,
  });
}
