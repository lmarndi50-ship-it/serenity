import type { Request, Response } from 'express';
import { Role, type Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/response';
import { requireUser } from '../middleware/auth';
import { percentage, toDateOnly } from '../utils/academics';
import {
  createNotification,
  createNotificationsForMany,
  evaluateAttendanceWarnings,
} from '../services/notification.service';
import { getSubjectPerformance } from '../services/analytics.service';

/**
 * Confirms the caller may write to this subject.
 * Admins pass for any subject; teachers only for their own.
 */
async function assertSubjectAccess(req: Request, subjectId: string) {
  const user = requireUser(req);
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true, teacherId: true, semesterId: true, sectionId: true },
  });
  if (!subject) throw ApiError.notFound('Subject not found.');
  if (user.role === Role.ADMIN) return subject;
  if (!user.teacherId || subject.teacherId !== user.teacherId) {
    throw ApiError.forbidden('You are not assigned to this subject.');
  }
  return subject;
}

export async function getMySubjects(req: Request, res: Response) {
  const user = requireUser(req);
  const subjects = await prisma.subject.findMany({
    where: user.role === Role.ADMIN ? {} : { teacherId: user.teacherId },
    include: {
      semester: { select: { name: true, number: true } },
      section: { select: { name: true } },
      department: { select: { name: true, code: true } },
      _count: { select: { enrollments: true, tests: true, assignments: true } },
    },
    orderBy: [{ semester: { number: 'asc' } }, { name: 'asc' }],
  });

  sendSuccess(
    res,
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      credits: s.credits,
      semester: s.semester.name,
      semesterNumber: s.semester.number,
      section: s.section.name,
      department: s.department.name,
      studentCount: s._count.enrollments,
      testCount: s._count.tests,
      assignmentCount: s._count.assignments,
    })),
  );
}

export async function getStudentsForSubject(req: Request, res: Response) {
  const { subjectId } = req.query as { subjectId?: string };
  if (!subjectId) throw ApiError.badRequest('Choose a subject first.');
  await assertSubjectAccess(req, subjectId);

  const enrollments = await prisma.enrollment.findMany({
    where: { subjectId },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, email: true, avatarUrl: true } },
          section: { select: { name: true } },
        },
      },
    },
  });

  const rows = enrollments
    .map((e) => ({
      studentId: e.studentId,
      rollNumber: e.student.rollNumber,
      name: e.student.user.fullName,
      email: e.student.user.email,
      avatarUrl: e.student.user.avatarUrl,
      section: e.student.section.name,
    }))
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

  sendSuccess(res, rows);
}

/**
 * Returns the class roster pre-filled with any attendance already saved for
 * this subject/date/period, so the teacher edits rather than duplicates.
 */
export async function getAttendanceSheet(req: Request, res: Response) {
  const { subjectId, date, period } = req.query as unknown as {
    subjectId: string;
    date: string;
    period: number;
  };
  await assertSubjectAccess(req, subjectId);

  const day = toDateOnly(date);
  const [enrollments, existing] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subjectId },
      include: { student: { include: { user: { select: { fullName: true } } } } },
    }),
    prisma.attendance.findMany({ where: { subjectId, date: day, period } }),
  ]);

  const existingByStudent = new Map(existing.map((a) => [a.studentId, a]));

  const students = enrollments
    .map((e) => {
      const record = existingByStudent.get(e.studentId);
      return {
        studentId: e.studentId,
        rollNumber: e.student.rollNumber,
        name: e.student.user.fullName,
        status: record?.status ?? null,
        remarks: record?.remarks ?? null,
        attendanceId: record?.id ?? null,
      };
    })
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

  sendSuccess(res, {
    subjectId,
    date,
    period,
    alreadyMarked: existing.length > 0,
    students,
  });
}

/**
 * Saves a full attendance sheet. Idempotent by (student, subject, date, period)
 * — re-saving the same sheet updates rather than duplicating.
 */
export async function markAttendance(req: Request, res: Response) {
  const user = requireUser(req);
  const body = req.body as {
    subjectId: string;
    date: string;
    period: number;
    entries: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LEAVE'; remarks?: string }[];
  };

  await assertSubjectAccess(req, body.subjectId);
  const day = toDateOnly(body.date);

  if (day.getTime() > toDateOnly(new Date()).getTime()) {
    throw ApiError.badRequest('Attendance cannot be marked for a future date.');
  }

  // Only students actually enrolled in this subject may be marked.
  const enrolled = await prisma.enrollment.findMany({
    where: { subjectId: body.subjectId },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrolled.map((e) => e.studentId));
  const strangers = body.entries.filter((e) => !enrolledIds.has(e.studentId));
  if (strangers.length > 0) {
    throw ApiError.badRequest(`${strangers.length} of the submitted students are not enrolled in this subject.`);
  }

  await prisma.$transaction(
    body.entries.map((entry) =>
      prisma.attendance.upsert({
        where: {
          studentId_subjectId_date_period: {
            studentId: entry.studentId,
            subjectId: body.subjectId,
            date: day,
            period: body.period,
          },
        },
        create: {
          studentId: entry.studentId,
          subjectId: body.subjectId,
          teacherId: user.teacherId ?? null,
          date: day,
          period: body.period,
          status: entry.status,
          remarks: entry.remarks ?? null,
        },
        update: {
          status: entry.status,
          remarks: entry.remarks ?? null,
          teacherId: user.teacherId ?? null,
        },
      }),
    ),
  );

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'MARK_ATTENDANCE',
      entity: 'Attendance',
      entityId: body.subjectId,
      metadata: { date: body.date, period: body.period, count: body.entries.length },
    },
  });

  // Warn any student who has now dropped below the threshold.
  await evaluateAttendanceWarnings(
    body.entries.map((e) => ({ studentId: e.studentId, subjectId: body.subjectId })),
  );

  sendSuccess(res, { saved: body.entries.length, date: body.date, period: body.period }, 201);
}

export async function updateAttendance(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as { status: 'PRESENT' | 'ABSENT' | 'LEAVE'; remarks?: string };

  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Attendance record not found.');
  await assertSubjectAccess(req, record.subjectId);

  const updated = await prisma.attendance.update({
    where: { id },
    data: { status: body.status, remarks: body.remarks ?? null },
  });

  await evaluateAttendanceWarnings([
    { studentId: record.studentId, subjectId: record.subjectId },
  ]);

  sendSuccess(res, updated);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export async function listTests(req: Request, res: Response) {
  const user = requireUser(req);
  const { subjectId } = req.query as { subjectId?: string };

  const where: Prisma.TestWhereInput = {
    ...(subjectId ? { subjectId } : {}),
    ...(user.role === Role.ADMIN ? {} : { subject: { teacherId: user.teacherId } }),
  };

  const tests = await prisma.test.findMany({
    where,
    include: {
      subject: { select: { name: true, code: true } },
      _count: { select: { marks: true } },
    },
    orderBy: { testDate: 'desc' },
  });

  sendSuccess(
    res,
    tests.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      testDate: t.testDate.toISOString(),
      maxMarks: t.maxMarks,
      isPublished: t.isPublished,
      subjectId: t.subjectId,
      subject: t.subject.name,
      subjectCode: t.subject.code,
      marksEntered: t._count.marks,
    })),
  );
}

export async function createTest(req: Request, res: Response) {
  const user = requireUser(req);
  const body = req.body as {
    subjectId: string;
    name: string;
    description?: string;
    testDate: string;
    maxMarks: number;
    isPublished?: boolean;
  };

  await assertSubjectAccess(req, body.subjectId);

  const test = await prisma.test.create({
    data: {
      subjectId: body.subjectId,
      name: body.name,
      description: body.description ?? null,
      testDate: toDateOnly(body.testDate),
      maxMarks: body.maxMarks,
      isPublished: body.isPublished ?? false,
      teacherId: user.teacherId ?? null,
    },
    include: { subject: { select: { name: true } } },
  });

  // Surface the test on the calendar so students see it under "Upcoming".
  await prisma.calendarEvent.create({
    data: {
      title: `${test.subject.name} — ${test.name}`,
      description: test.description,
      type: 'TEST',
      startAt: test.testDate,
      subjectId: test.subjectId,
      testId: test.id,
      createdById: user.id,
    },
  });

  const students = await prisma.enrollment.findMany({
    where: { subjectId: body.subjectId },
    select: { student: { select: { userId: true } } },
  });
  await createNotificationsForMany(
    students.map((s) => s.student.userId),
    {
      type: 'TEST',
      title: 'New class test scheduled',
      message: `${test.subject.name} — ${test.name} on ${test.testDate.toISOString().slice(0, 10)} (${test.maxMarks} marks).`,
      link: '/tests',
    },
  );

  sendSuccess(res, test, 201);
}

export async function updateTest(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as Partial<{
    name: string;
    description: string;
    testDate: string;
    maxMarks: number;
    isPublished: boolean;
  }>;

  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) throw ApiError.notFound('Test not found.');
  await assertSubjectAccess(req, test.subjectId);

  if (body.maxMarks !== undefined) {
    const overMax = await prisma.testMark.count({
      where: { testId: id, obtainedMarks: { gt: body.maxMarks } },
    });
    if (overMax > 0) {
      throw ApiError.badRequest(
        `${overMax} students already have marks above ${body.maxMarks}. Correct those marks first.`,
      );
    }
  }

  const updated = await prisma.test.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.testDate !== undefined ? { testDate: toDateOnly(body.testDate) } : {}),
      ...(body.maxMarks !== undefined ? { maxMarks: body.maxMarks } : {}),
      ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
    },
  });

  sendSuccess(res, updated);
}

export async function deleteTest(req: Request, res: Response) {
  const { id } = req.params;
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) throw ApiError.notFound('Test not found.');
  await assertSubjectAccess(req, test.subjectId);
  await prisma.test.delete({ where: { id } });
  sendSuccess(res, { message: 'Test deleted.' });
}

/** Roster for mark entry, pre-filled with anything already saved. */
export async function getTestMarkSheet(req: Request, res: Response) {
  const { id } = req.params;
  const test = await prisma.test.findUnique({
    where: { id },
    include: { subject: { select: { id: true, name: true, code: true } } },
  });
  if (!test) throw ApiError.notFound('Test not found.');
  await assertSubjectAccess(req, test.subjectId);

  const [enrollments, marks] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subjectId: test.subjectId },
      include: { student: { include: { user: { select: { fullName: true } } } } },
    }),
    prisma.testMark.findMany({ where: { testId: id } }),
  ]);

  const marksByStudent = new Map(marks.map((m) => [m.studentId, m]));

  sendSuccess(res, {
    test: {
      id: test.id,
      name: test.name,
      testDate: test.testDate.toISOString(),
      maxMarks: test.maxMarks,
      isPublished: test.isPublished,
      subject: test.subject.name,
      subjectCode: test.subject.code,
    },
    students: enrollments
      .map((e) => {
        const m = marksByStudent.get(e.studentId);
        return {
          studentId: e.studentId,
          rollNumber: e.student.rollNumber,
          name: e.student.user.fullName,
          obtainedMarks: m?.obtainedMarks ?? null,
          isAbsent: m?.isAbsent ?? false,
          remarks: m?.remarks ?? null,
        };
      })
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
  });
}

export async function saveTestMarks(req: Request, res: Response) {
  const user = requireUser(req);
  const { id } = req.params;
  const body = req.body as {
    marks: { studentId: string; obtainedMarks: number; isAbsent?: boolean; remarks?: string }[];
    publish?: boolean;
  };

  const test = await prisma.test.findUnique({
    where: { id },
    include: { subject: { select: { id: true, name: true } } },
  });
  if (!test) throw ApiError.notFound('Test not found.');
  await assertSubjectAccess(req, test.subjectId);

  // Marks must fall inside the test's own maximum.
  const invalid = body.marks.filter((m) => !m.isAbsent && m.obtainedMarks > test.maxMarks);
  if (invalid.length > 0) {
    throw ApiError.badRequest(`Marks cannot exceed the maximum of ${test.maxMarks}.`);
  }

  const enrolled = await prisma.enrollment.findMany({
    where: { subjectId: test.subjectId },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrolled.map((e) => e.studentId));
  if (body.marks.some((m) => !enrolledIds.has(m.studentId))) {
    throw ApiError.badRequest('Some students are not enrolled in this subject.');
  }

  await prisma.$transaction([
    ...body.marks.map((m) =>
      prisma.testMark.upsert({
        where: { testId_studentId: { testId: id, studentId: m.studentId } },
        create: {
          testId: id,
          studentId: m.studentId,
          obtainedMarks: m.isAbsent ? 0 : m.obtainedMarks,
          isAbsent: m.isAbsent ?? false,
          remarks: m.remarks ?? null,
        },
        update: {
          obtainedMarks: m.isAbsent ? 0 : m.obtainedMarks,
          isAbsent: m.isAbsent ?? false,
          remarks: m.remarks ?? null,
        },
      }),
    ),
    ...(body.publish
      ? [prisma.test.update({ where: { id }, data: { isPublished: true } })]
      : []),
  ]);

  if (body.publish) {
    const students = await prisma.enrollment.findMany({
      where: { subjectId: test.subjectId },
      select: { student: { select: { userId: true } } },
    });
    await createNotificationsForMany(
      students.map((s) => s.student.userId),
      {
        type: 'TEST',
        title: 'Test marks published',
        message: `${test.subject.name} — ${test.name} marks have been published.`,
        link: '/tests',
      },
    );
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'SAVE_TEST_MARKS',
      entity: 'Test',
      entityId: id,
      metadata: { count: body.marks.length, published: body.publish ?? false },
    },
  });

  sendSuccess(res, { saved: body.marks.length, published: body.publish ?? false });
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function listAssignments(req: Request, res: Response) {
  const user = requireUser(req);
  const { subjectId } = req.query as { subjectId?: string };

  const assignments = await prisma.assignment.findMany({
    where: {
      ...(subjectId ? { subjectId } : {}),
      ...(user.role === Role.ADMIN ? {} : { subject: { teacherId: user.teacherId } }),
    },
    include: {
      subject: { select: { name: true, code: true } },
      submissions: { select: { status: true } },
    },
    orderBy: { dueDate: 'desc' },
  });

  sendSuccess(
    res,
    assignments.map((a) => {
      const submitted = a.submissions.filter(
        (s) => s.status === 'SUBMITTED' || s.status === 'LATE' || s.status === 'GRADED',
      ).length;
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate.toISOString(),
        maxMarks: a.maxMarks,
        attachmentUrl: a.attachmentUrl,
        subjectId: a.subjectId,
        subject: a.subject.name,
        subjectCode: a.subject.code,
        totalStudents: a.submissions.length,
        submitted,
        graded: a.submissions.filter((s) => s.status === 'GRADED').length,
        submissionRate: percentage(submitted, a.submissions.length),
      };
    }),
  );
}

export async function createAssignment(req: Request, res: Response) {
  const user = requireUser(req);
  const body = req.body as {
    subjectId: string;
    title: string;
    description?: string;
    dueDate: string;
    maxMarks: number;
  };

  await assertSubjectAccess(req, body.subjectId);
  const file = (req as Request & { file?: Express.Multer.File }).file;
  const dueDate = new Date(body.dueDate);

  const assignment = await prisma.assignment.create({
    data: {
      subjectId: body.subjectId,
      title: body.title,
      description: body.description ?? null,
      dueDate,
      maxMarks: body.maxMarks,
      attachmentUrl: file ? `/uploads/${file.filename}` : null,
      teacherId: user.teacherId ?? null,
    },
    include: { subject: { select: { name: true } } },
  });

  // Every enrolled student gets a PENDING submission row up front, so the
  // "8 / 10 submitted" figure has a real denominator.
  const enrollments = await prisma.enrollment.findMany({
    where: { subjectId: body.subjectId },
    include: { student: { select: { id: true, userId: true } } },
  });

  if (enrollments.length > 0) {
    await prisma.assignmentSubmission.createMany({
      data: enrollments.map((e) => ({
        assignmentId: assignment.id,
        studentId: e.studentId,
        status: 'PENDING' as const,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.calendarEvent.create({
    data: {
      title: `${assignment.subject.name} — ${assignment.title}`,
      description: assignment.description,
      type: 'ASSIGNMENT',
      startAt: dueDate,
      subjectId: assignment.subjectId,
      assignmentId: assignment.id,
      createdById: user.id,
    },
  });

  await createNotificationsForMany(
    enrollments.map((e) => e.student.userId),
    {
      type: 'ASSIGNMENT',
      title: 'New assignment posted',
      message: `${assignment.subject.name}: "${assignment.title}" is due on ${dueDate.toISOString().slice(0, 10)}.`,
      link: '/assignments',
    },
  );

  sendSuccess(res, assignment, 201);
}

export async function updateAssignment(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as Partial<{
    title: string;
    description: string;
    dueDate: string;
    maxMarks: number;
  }>;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw ApiError.notFound('Assignment not found.');
  await assertSubjectAccess(req, assignment.subjectId);

  const updated = await prisma.assignment.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.dueDate !== undefined ? { dueDate: new Date(body.dueDate) } : {}),
      ...(body.maxMarks !== undefined ? { maxMarks: body.maxMarks } : {}),
    },
  });

  if (body.dueDate !== undefined) {
    await prisma.calendarEvent.updateMany({
      where: { assignmentId: id },
      data: { startAt: new Date(body.dueDate) },
    });
  }

  sendSuccess(res, updated);
}

export async function deleteAssignment(req: Request, res: Response) {
  const { id } = req.params;
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw ApiError.notFound('Assignment not found.');
  await assertSubjectAccess(req, assignment.subjectId);
  await prisma.assignment.delete({ where: { id } });
  sendSuccess(res, { message: 'Assignment deleted.' });
}

export async function getSubmissions(req: Request, res: Response) {
  const { id } = req.params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { subject: { select: { name: true, code: true } } },
  });
  if (!assignment) throw ApiError.notFound('Assignment not found.');
  await assertSubjectAccess(req, assignment.subjectId);

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: id },
    include: { student: { include: { user: { select: { fullName: true } } } } },
  });

  sendSuccess(res, {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      dueDate: assignment.dueDate.toISOString(),
      maxMarks: assignment.maxMarks,
      subject: assignment.subject.name,
    },
    submissions: submissions
      .map((s) => ({
        id: s.id,
        studentId: s.studentId,
        rollNumber: s.student.rollNumber,
        name: s.student.user.fullName,
        status: s.status,
        submittedAt: s.submittedAt?.toISOString() ?? null,
        fileUrl: s.fileUrl,
        contentText: s.contentText,
        obtainedMarks: s.obtainedMarks,
        feedback: s.feedback,
      }))
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
  });
}

export async function gradeSubmission(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as { obtainedMarks: number; feedback?: string };

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id },
    include: { assignment: { include: { subject: { select: { name: true } } } }, student: true },
  });
  if (!submission) throw ApiError.notFound('Submission not found.');
  await assertSubjectAccess(req, submission.assignment.subjectId);

  if (body.obtainedMarks > submission.assignment.maxMarks) {
    throw ApiError.badRequest(
      `Marks cannot exceed the maximum of ${submission.assignment.maxMarks}.`,
    );
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id },
    data: {
      obtainedMarks: body.obtainedMarks,
      feedback: body.feedback ?? null,
      status: 'GRADED',
      gradedAt: new Date(),
    },
  });

  await createNotification({
    userId: submission.student.userId,
    type: 'ASSIGNMENT',
    title: 'Assignment graded',
    message: `${submission.assignment.subject.name}: "${submission.assignment.title}" — ${body.obtainedMarks}/${submission.assignment.maxMarks}.`,
    link: '/assignments',
  });

  sendSuccess(res, updated);
}

/** Flags overdue PENDING submissions as NOT_SUBMITTED. */
export async function closeOverdueSubmissions(req: Request, res: Response) {
  const { id } = req.params;
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw ApiError.notFound('Assignment not found.');
  await assertSubjectAccess(req, assignment.subjectId);

  if (assignment.dueDate > new Date()) {
    throw ApiError.badRequest('This assignment is not overdue yet.');
  }

  const result = await prisma.assignmentSubmission.updateMany({
    where: { assignmentId: id, status: 'PENDING' },
    data: { status: 'NOT_SUBMITTED' },
  });

  sendSuccess(res, { updated: result.count });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getTeacherDashboard(req: Request, res: Response) {
  const user = requireUser(req);
  if (!user.teacherId && user.role !== Role.ADMIN) {
    throw ApiError.forbidden('No teacher profile is linked to this account.');
  }

  const subjectFilter =
    user.role === Role.ADMIN ? {} : ({ teacherId: user.teacherId } as const);

  const subjects = await prisma.subject.findMany({
    where: subjectFilter,
    include: {
      semester: { select: { name: true } },
      section: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
  });
  const subjectIds = subjects.map((s) => s.id);
  const today = toDateOnly(new Date());

  const [studentCount, markedToday, recentTests, pendingGrading, upcomingDeadlines, unread] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { studentId: true },
        distinct: ['studentId'],
      }),
      prisma.attendance.findMany({
        where: { subjectId: { in: subjectIds }, date: today },
        select: { subjectId: true },
        distinct: ['subjectId'],
      }),
      prisma.test.findMany({
        where: { subjectId: { in: subjectIds } },
        include: {
          subject: { select: { name: true } },
          _count: { select: { marks: true } },
        },
        orderBy: { testDate: 'desc' },
        take: 5,
      }),
      prisma.assignmentSubmission.count({
        where: {
          assignment: { subjectId: { in: subjectIds } },
          status: { in: ['SUBMITTED', 'LATE'] },
        },
      }),
      prisma.assignment.findMany({
        where: { subjectId: { in: subjectIds }, dueDate: { gte: new Date() } },
        include: { subject: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

  const markedSubjectIds = new Set(markedToday.map((m) => m.subjectId));

  sendSuccess(res, {
    kpis: {
      assignedSubjects: subjects.length,
      totalStudents: studentCount.length,
      attendancePending: subjects.filter((s) => !markedSubjectIds.has(s.id)).length,
      pendingGrading,
      unreadNotifications: unread,
    },
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      semester: s.semester.name,
      section: s.section.name,
      studentCount: s._count.enrollments,
      attendanceMarkedToday: markedSubjectIds.has(s.id),
    })),
    recentTests: recentTests.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject.name,
      testDate: t.testDate.toISOString(),
      maxMarks: t.maxMarks,
      isPublished: t.isPublished,
      marksEntered: t._count.marks,
    })),
    upcomingDeadlines: upcomingDeadlines.map((a) => ({
      id: a.id,
      title: a.title,
      subject: a.subject.name,
      dueDate: a.dueDate.toISOString(),
    })),
  });
}

export async function getClassPerformance(req: Request, res: Response) {
  const { subjectId } = req.params;
  await assertSubjectAccess(req, subjectId);
  const data = await getSubjectPerformance(subjectId);
  if (!data) throw ApiError.notFound('Subject not found.');
  sendSuccess(res, data);
}

export { assertSubjectAccess };
