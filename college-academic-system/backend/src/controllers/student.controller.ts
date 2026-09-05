import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/response';
import { requireStudentId, requireUser } from '../middleware/auth';
import {
  getAttendanceTrend,
  getStudentSummary,
  getSubjectAttendance,
  getUpcoming,
} from '../services/analytics.service';
import { percentage, tallyAttendance, toDateOnly } from '../utils/academics';

export async function getProfile(req: Request, res: Response) {
  const studentId = requireStudentId(req);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
        },
      },
      department: true,
      course: true,
      semester: true,
      section: true,
    },
  });
  if (!student) throw ApiError.notFound('Student profile not found.');
  sendSuccess(res, student);
}

/** Everything the student dashboard renders, in one round trip. */
export async function getDashboard(req: Request, res: Response) {
  const studentId = requireStudentId(req);
  const user = requireUser(req);

  const [summary, subjects, trend, upcoming, recentTests, assignments, unreadCount, semester] =
    await Promise.all([
      getStudentSummary(studentId),
      getSubjectAttendance(studentId),
      getAttendanceTrend(studentId, '8w'),
      getUpcoming(studentId, 5),
      prisma.testMark.findMany({
        where: { studentId, test: { isPublished: true } },
        include: { test: { include: { subject: { select: { name: true, code: true } } } } },
        orderBy: { test: { testDate: 'desc' } },
        take: 5,
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: {
          assignment: { include: { subject: { select: { name: true, code: true } } } },
        },
        orderBy: { assignment: { dueDate: 'desc' } },
        take: 5,
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { semester: { select: { name: true, number: true } } },
      }),
    ]);

  sendSuccess(res, {
    summary,
    subjectAttendance: subjects,
    attendanceTrend: trend,
    upcoming,
    semester: semester?.semester ?? null,
    unreadNotifications: unreadCount,
    recentTests: recentTests.map((m) => ({
      id: m.id,
      subject: m.test.subject.name,
      subjectCode: m.test.subject.code,
      testName: m.test.name,
      testDate: m.test.testDate.toISOString(),
      obtainedMarks: m.isAbsent ? 0 : m.obtainedMarks,
      maxMarks: m.test.maxMarks,
      isAbsent: m.isAbsent,
      percentage: percentage(m.isAbsent ? 0 : m.obtainedMarks, m.test.maxMarks),
    })),
    recentAssignments: assignments.map((s) => ({
      id: s.id,
      subject: s.assignment.subject.name,
      subjectCode: s.assignment.subject.code,
      title: s.assignment.title,
      dueDate: s.assignment.dueDate.toISOString(),
      status: s.status,
      obtainedMarks: s.obtainedMarks,
      maxMarks: s.assignment.maxMarks,
    })),
  });
}

export async function getAttendance(req: Request, res: Response) {
  const studentId = requireStudentId(req);
  const { subjectId, from, to } = req.query as {
    subjectId?: string;
    from?: string;
    to?: string;
  };

  const [subjectRows, records] = await Promise.all([
    getSubjectAttendance(studentId),
    prisma.attendance.findMany({
      where: {
        studentId,
        ...(subjectId ? { subjectId } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: toDateOnly(from) } : {}),
                ...(to ? { lte: toDateOnly(to) } : {}),
              },
            }
          : {}),
      },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: [{ date: 'desc' }, { period: 'asc' }],
      take: 500,
    }),
  ]);

  const filtered = subjectId ? subjectRows.filter((r) => r.subjectId === subjectId) : subjectRows;
  const overall = tallyAttendance(records.map((r) => ({ status: r.status })));

  sendSuccess(res, {
    subjects: filtered,
    overall,
    records: records.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      period: r.period,
      status: r.status,
      remarks: r.remarks,
      subject: r.subject.name,
      subjectCode: r.subject.code,
    })),
  });
}

export async function getAttendanceTrendHandler(req: Request, res: Response) {
  const studentId = requireStudentId(req);
  const { range } = req.query as { range: '4w' | '8w' | 'semester' };
  sendSuccess(res, await getAttendanceTrend(studentId, range));
}

export async function getTests(req: Request, res: Response) {
  const studentId = requireStudentId(req);

  const [marks, upcomingTests] = await Promise.all([
    prisma.testMark.findMany({
      where: { studentId, test: { isPublished: true } },
      include: {
        test: {
          include: {
            subject: { select: { name: true, code: true } },
            teacher: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: { test: { testDate: 'desc' } },
    }),
    prisma.test.findMany({
      where: {
        subject: { enrollments: { some: { studentId } } },
        testDate: { gte: toDateOnly(new Date()) },
      },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { testDate: 'asc' },
      take: 10,
    }),
  ]);

  const rows = marks.map((m) => ({
    id: m.id,
    testId: m.testId,
    subject: m.test.subject.name,
    subjectCode: m.test.subject.code,
    faculty: m.test.teacher?.user.fullName ?? 'Not assigned',
    testName: m.test.name,
    testDate: m.test.testDate.toISOString(),
    obtainedMarks: m.isAbsent ? 0 : m.obtainedMarks,
    maxMarks: m.test.maxMarks,
    isAbsent: m.isAbsent,
    percentage: percentage(m.isAbsent ? 0 : m.obtainedMarks, m.test.maxMarks),
    remarks: m.remarks,
  }));

  const totals = rows.reduce(
    (acc, r) => ({ obtained: acc.obtained + r.obtainedMarks, max: acc.max + r.maxMarks }),
    { obtained: 0, max: 0 },
  );

  sendSuccess(res, {
    marks: rows,
    average: percentage(totals.obtained, totals.max),
    upcoming: upcomingTests.map((t) => ({
      id: t.id,
      subject: t.subject.name,
      name: t.name,
      testDate: t.testDate.toISOString(),
      maxMarks: t.maxMarks,
    })),
  });
}

export async function getAssignments(req: Request, res: Response) {
  const studentId = requireStudentId(req);

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { studentId },
    include: {
      assignment: {
        include: {
          subject: { select: { name: true, code: true } },
          teacher: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { assignment: { dueDate: 'desc' } },
  });

  sendSuccess(res, {
    assignments: submissions.map((s) => ({
      id: s.id,
      assignmentId: s.assignmentId,
      subject: s.assignment.subject.name,
      subjectCode: s.assignment.subject.code,
      faculty: s.assignment.teacher?.user.fullName ?? 'Not assigned',
      title: s.assignment.title,
      description: s.assignment.description,
      dueDate: s.assignment.dueDate.toISOString(),
      maxMarks: s.assignment.maxMarks,
      attachmentUrl: s.assignment.attachmentUrl,
      status: s.status,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      fileUrl: s.fileUrl,
      contentText: s.contentText,
      obtainedMarks: s.obtainedMarks,
      feedback: s.feedback,
    })),
  });
}

/** Student uploads or updates their own submission. Late detection is server-side. */
export async function submitAssignment(req: Request, res: Response) {
  const studentId = requireStudentId(req);
  const { id } = req.params;

  const submission = await prisma.assignmentSubmission.findFirst({
    where: { assignmentId: id, studentId },
    include: { assignment: true },
  });
  if (!submission) throw ApiError.notFound('This assignment is not assigned to you.');
  if (submission.status === 'GRADED') {
    throw ApiError.badRequest('This assignment has already been graded and cannot be resubmitted.');
  }

  const now = new Date();
  const isLate = now > submission.assignment.dueDate;
  const file = (req as Request & { file?: Express.Multer.File }).file;

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submission.id },
    data: {
      status: isLate ? 'LATE' : 'SUBMITTED',
      submittedAt: now,
      contentText: (req.body?.contentText as string | undefined) ?? submission.contentText,
      fileUrl: file ? `/uploads/${file.filename}` : submission.fileUrl,
    },
  });

  sendSuccess(res, updated);
}

export async function getNotifications(req: Request, res: Response) {
  const user = requireUser(req);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.isRead).length;
  sendSuccess(res, { notifications, unread });
}

export async function markNotificationRead(req: Request, res: Response) {
  const user = requireUser(req);
  const { id } = req.params;
  const result = await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true, readAt: new Date() },
  });
  if (result.count === 0) throw ApiError.notFound('Notification not found.');
  sendSuccess(res, { message: 'Marked as read.' });
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  sendSuccess(res, { updated: result.count });
}

export async function getSubjects(req: Request, res: Response) {
  const studentId = requireStudentId(req);
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      subject: {
        include: {
          teacher: { include: { user: { select: { fullName: true, email: true } } } },
          semester: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
    orderBy: { subject: { name: 'asc' } },
  });

  sendSuccess(
    res,
    enrollments.map((e) => ({
      id: e.subject.id,
      name: e.subject.name,
      code: e.subject.code,
      credits: e.subject.credits,
      totalPlannedClasses: e.subject.totalPlannedClasses,
      faculty: e.subject.teacher?.user.fullName ?? 'Not assigned',
      facultyEmail: e.subject.teacher?.user.email ?? null,
      semester: e.subject.semester.name,
      section: e.subject.section.name,
    })),
  );
}
