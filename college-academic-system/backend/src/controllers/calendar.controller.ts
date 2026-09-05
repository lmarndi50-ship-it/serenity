import type { Request, Response } from 'express';
import { Role, type Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/response';
import { requireUser } from '../middleware/auth';

/**
 * Calendar events visible to the caller.
 * Students see events for their own subjects plus college-wide entries;
 * teachers see their subjects; admins see everything.
 */
export async function listEvents(req: Request, res: Response) {
  const user = requireUser(req);
  const { from, to, type } = req.query as { from?: string; to?: string; type?: string };

  let subjectScope: Prisma.CalendarEventWhereInput = {};

  if (user.role === Role.STUDENT && user.studentId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.studentId },
      select: { subjectId: true },
    });
    subjectScope = {
      OR: [{ subjectId: { in: enrollments.map((e) => e.subjectId) } }, { subjectId: null }],
    };
  } else if (user.role === Role.TEACHER && user.teacherId) {
    const subjects = await prisma.subject.findMany({
      where: { teacherId: user.teacherId },
      select: { id: true },
    });
    subjectScope = {
      OR: [{ subjectId: { in: subjects.map((s) => s.id) } }, { subjectId: null }],
    };
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      ...subjectScope,
      ...(type ? { type: type as Prisma.EnumEventTypeFilter['equals'] } : {}),
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      subject: {
        select: {
          name: true,
          code: true,
          teacher: { include: { user: { select: { fullName: true } } } },
        },
      },
      test: { select: { maxMarks: true } },
      assignment: { select: { maxMarks: true } },
    },
    orderBy: { startAt: 'asc' },
    take: 400,
  });

  sendSuccess(
    res,
    events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() ?? null,
      location: e.location,
      subject: e.subject?.name ?? null,
      subjectCode: e.subject?.code ?? null,
      faculty: e.subject?.teacher?.user.fullName ?? null,
      maxMarks: e.test?.maxMarks ?? e.assignment?.maxMarks ?? null,
    })),
  );
}

export async function createEvent(req: Request, res: Response) {
  const user = requireUser(req);
  const body = req.body as {
    title: string;
    description?: string;
    type: 'TEST' | 'ASSIGNMENT' | 'EXAM' | 'EVENT' | 'NOTICE' | 'HOLIDAY';
    startAt: string;
    endAt?: string;
    location?: string;
    subjectId?: string;
  };

  const event = await prisma.calendarEvent.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      type: body.type,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      location: body.location ?? null,
      subjectId: body.subjectId ?? null,
      createdById: user.id,
    },
  });

  sendSuccess(res, event, 201);
}

export async function deleteEvent(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.calendarEvent.delete({ where: { id } });
  sendSuccess(res, { message: 'Event removed.' });
}
