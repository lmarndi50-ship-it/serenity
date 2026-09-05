import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { Role, type Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/response';
import { requireUser } from '../middleware/auth';
import { getAdminAnalytics } from '../services/analytics.service';
import { academicSettingsSchema, getSettings, saveSettings } from '../services/settings.service';
import { createNotificationsForMany } from '../services/notification.service';
import { revokeAllForUser } from '../services/token.service';
import { BCRYPT_ROUNDS } from './auth.controller';

interface PageQuery {
  page: number;
  pageSize: number;
  search?: string;
}

function paginationMeta(total: number, { page, pageSize }: PageQuery) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function listStudents(req: Request, res: Response) {
  const query = req.query as unknown as PageQuery & {
    departmentId?: string;
    semesterId?: string;
    sectionId?: string;
  };

  const where: Prisma.StudentWhereInput = {
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    ...(query.search
      ? {
          OR: [
            { rollNumber: { contains: query.search, mode: 'insensitive' } },
            { registrationNo: { contains: query.search, mode: 'insensitive' } },
            { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
            { user: { email: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        department: { select: { name: true, code: true } },
        course: { select: { name: true, code: true } },
        semester: { select: { name: true, number: true } },
        section: { select: { name: true } },
      },
      orderBy: { rollNumber: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  sendSuccess(
    res,
    students.map((s) => ({
      id: s.id,
      userId: s.userId,
      rollNumber: s.rollNumber,
      registrationNo: s.registrationNo,
      admissionYear: s.admissionYear,
      name: s.user.fullName,
      email: s.user.email,
      phone: s.user.phone,
      isActive: s.user.isActive,
      department: s.department.name,
      departmentId: s.departmentId,
      course: s.course.name,
      courseId: s.courseId,
      semester: s.semester.name,
      semesterId: s.semesterId,
      section: s.section.name,
      sectionId: s.sectionId,
    })),
    200,
    paginationMeta(total, query),
  );
}

export async function createStudent(req: Request, res: Response) {
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

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: Role.STUDENT,
        fullName: body.fullName,
        phone: body.phone ?? null,
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        rollNumber: body.rollNumber.toUpperCase(),
        registrationNo: body.registrationNo.toUpperCase(),
        admissionYear: body.admissionYear,
        departmentId: body.departmentId,
        courseId: body.courseId,
        semesterId: body.semesterId,
        sectionId: body.sectionId,
      },
    });

    const subjects = await tx.subject.findMany({
      where: { semesterId: body.semesterId, sectionId: body.sectionId },
      select: { id: true },
    });
    if (subjects.length > 0) {
      await tx.enrollment.createMany({
        data: subjects.map((s) => ({
          studentId: student.id,
          subjectId: s.id,
          semesterId: body.semesterId,
        })),
        skipDuplicates: true,
      });
    }

    return student;
  });

  sendSuccess(res, created, 201);
}

export async function updateStudent(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw ApiError.notFound('Student not found.');

  const userFields = ['fullName', 'email', 'phone', 'isActive'] as const;
  const userData: Prisma.UserUpdateInput = {};
  for (const key of userFields) {
    if (body[key] !== undefined) {
      (userData as Record<string, unknown>)[key] = body[key];
    }
  }

  const studentFields = [
    'rollNumber',
    'registrationNo',
    'admissionYear',
    'departmentId',
    'courseId',
    'semesterId',
    'sectionId',
  ] as const;
  const studentData: Record<string, unknown> = {};
  for (const key of studentFields) {
    if (body[key] !== undefined) studentData[key] = body[key];
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: student.userId }, data: userData });
    }
    const s = Object.keys(studentData).length
      ? await tx.student.update({ where: { id }, data: studentData })
      : student;

    // Moving a student to a different semester/section re-enrols them.
    const semesterChanged =
      studentData.semesterId !== undefined && studentData.semesterId !== student.semesterId;
    const sectionChanged =
      studentData.sectionId !== undefined && studentData.sectionId !== student.sectionId;

    if (semesterChanged || sectionChanged) {
      const subjects = await tx.subject.findMany({
        where: { semesterId: s.semesterId, sectionId: s.sectionId },
        select: { id: true },
      });
      await tx.enrollment.createMany({
        data: subjects.map((sub) => ({
          studentId: s.id,
          subjectId: sub.id,
          semesterId: s.semesterId,
        })),
        skipDuplicates: true,
      });
    }

    return s;
  });

  sendSuccess(res, updated);
}

export async function deleteStudent(req: Request, res: Response) {
  const { id } = req.params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw ApiError.notFound('Student not found.');
  // Deleting the user cascades to the student row and all their records.
  await prisma.user.delete({ where: { id: student.userId } });
  sendSuccess(res, { message: 'Student removed.' });
}

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

export async function listTeachers(req: Request, res: Response) {
  const query = req.query as unknown as PageQuery & { departmentId?: string };

  const where: Prisma.TeacherWhereInput = {
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.search
      ? {
          OR: [
            { employeeCode: { contains: query.search, mode: 'insensitive' } },
            { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
            { user: { email: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, teachers] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        department: { select: { name: true, code: true } },
        _count: { select: { subjects: true } },
      },
      orderBy: { employeeCode: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  sendSuccess(
    res,
    teachers.map((t) => ({
      id: t.id,
      userId: t.userId,
      employeeCode: t.employeeCode,
      name: t.user.fullName,
      email: t.user.email,
      phone: t.user.phone,
      isActive: t.user.isActive,
      designation: t.designation,
      qualification: t.qualification,
      department: t.department.name,
      departmentId: t.departmentId,
      subjectCount: t._count.subjects,
    })),
    200,
    paginationMeta(total, query),
  );
}

export async function createTeacher(req: Request, res: Response) {
  const body = req.body as {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    employeeCode: string;
    designation?: string;
    qualification?: string;
    departmentId: string;
  };

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

  const teacher = await prisma.teacher.create({
    data: {
      employeeCode: body.employeeCode.toUpperCase(),
      designation: body.designation ?? 'Assistant Professor',
      qualification: body.qualification ?? null,
      department: { connect: { id: body.departmentId } },
      user: {
        create: {
          email: body.email,
          passwordHash,
          role: Role.TEACHER,
          fullName: body.fullName,
          phone: body.phone ?? null,
        },
      },
    },
  });

  sendSuccess(res, teacher, 201);
}

export async function updateTeacher(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) throw ApiError.notFound('Teacher not found.');

  const userData: Record<string, unknown> = {};
  for (const key of ['fullName', 'email', 'phone'] as const) {
    if (body[key] !== undefined) userData[key] = body[key];
  }
  const teacherData: Record<string, unknown> = {};
  for (const key of ['employeeCode', 'designation', 'qualification', 'departmentId'] as const) {
    if (body[key] !== undefined) teacherData[key] = body[key];
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: teacher.userId }, data: userData });
    }
    if (Object.keys(teacherData).length > 0) {
      await tx.teacher.update({ where: { id }, data: teacherData });
    }
  });

  sendSuccess(res, await prisma.teacher.findUnique({ where: { id } }));
}

export async function deleteTeacher(req: Request, res: Response) {
  const { id } = req.params;
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) throw ApiError.notFound('Teacher not found.');
  await prisma.user.delete({ where: { id: teacher.userId } });
  sendSuccess(res, { message: 'Teacher removed.' });
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function listSubjects(req: Request, res: Response) {
  const query = req.query as unknown as PageQuery & {
    departmentId?: string;
    semesterId?: string;
    sectionId?: string;
  };

  const where: Prisma.SubjectWhereInput = {
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, subjects] = await Promise.all([
    prisma.subject.count({ where }),
    prisma.subject.findMany({
      where,
      include: {
        teacher: { include: { user: { select: { fullName: true } } } },
        department: { select: { name: true } },
        course: { select: { name: true } },
        semester: { select: { name: true, number: true } },
        section: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ semester: { number: 'asc' } }, { name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  sendSuccess(
    res,
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      credits: s.credits,
      totalPlannedClasses: s.totalPlannedClasses,
      faculty: s.teacher?.user.fullName ?? null,
      teacherId: s.teacherId,
      department: s.department.name,
      departmentId: s.departmentId,
      course: s.course.name,
      courseId: s.courseId,
      semester: s.semester.name,
      semesterId: s.semesterId,
      section: s.section.name,
      sectionId: s.sectionId,
      studentCount: s._count.enrollments,
    })),
    200,
    paginationMeta(total, query),
  );
}

export async function createSubject(req: Request, res: Response) {
  const body = req.body as {
    name: string;
    code: string;
    credits: number;
    totalPlannedClasses: number;
    departmentId: string;
    courseId: string;
    semesterId: string;
    sectionId: string;
    teacherId?: string | null;
  };

  const subject = await prisma.subject.create({
    data: {
      name: body.name,
      code: body.code.toUpperCase(),
      credits: body.credits,
      totalPlannedClasses: body.totalPlannedClasses,
      departmentId: body.departmentId,
      courseId: body.courseId,
      semesterId: body.semesterId,
      sectionId: body.sectionId,
      teacherId: body.teacherId ?? null,
    },
  });

  // Auto-enrol the matching cohort so the subject is immediately usable.
  const students = await prisma.student.findMany({
    where: { semesterId: body.semesterId, sectionId: body.sectionId },
    select: { id: true },
  });
  if (students.length > 0) {
    await prisma.enrollment.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        subjectId: subject.id,
        semesterId: body.semesterId,
      })),
      skipDuplicates: true,
    });
  }

  sendSuccess(res, subject, 201);
}

export async function updateSubject(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of [
    'name',
    'code',
    'credits',
    'totalPlannedClasses',
    'departmentId',
    'courseId',
    'semesterId',
    'sectionId',
    'teacherId',
  ] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  const updated = await prisma.subject.update({ where: { id }, data });
  sendSuccess(res, updated);
}

export async function deleteSubject(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.subject.delete({ where: { id } });
  sendSuccess(res, { message: 'Subject removed.' });
}

// ---------------------------------------------------------------------------
// Users, roles, settings, analytics
// ---------------------------------------------------------------------------

export async function listUsers(req: Request, res: Response) {
  const query = req.query as unknown as PageQuery & { role?: Role };

  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  sendSuccess(res, users, 200, paginationMeta(total, query));
}

export async function updateUserRole(req: Request, res: Response) {
  const admin = requireUser(req);
  const { id } = req.params;
  const { role } = req.body as { role: Role };

  if (id === admin.id) throw ApiError.badRequest('You cannot change your own role.');

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, student: { select: { id: true } }, teacher: { select: { id: true } } },
  });
  if (!user) throw ApiError.notFound('User not found.');

  // A role change without the matching profile would leave the account unusable.
  if (role === Role.STUDENT && !user.student) {
    throw ApiError.badRequest('This account has no student profile, so it cannot become a student.');
  }
  if (role === Role.TEACHER && !user.teacher) {
    throw ApiError.badRequest('This account has no teacher profile, so it cannot become a teacher.');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true, fullName: true },
  });

  // Existing tokens carry the old role; force a fresh sign-in.
  await revokeAllForUser(id);

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CHANGE_ROLE',
      entity: 'User',
      entityId: id,
      metadata: { from: user.role, to: role },
    },
  });

  sendSuccess(res, updated);
}

export async function setUserActive(req: Request, res: Response) {
  const admin = requireUser(req);
  const { id } = req.params;
  const { isActive } = req.body as { isActive: boolean };
  if (id === admin.id) throw ApiError.badRequest('You cannot deactivate your own account.');

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  });
  if (!isActive) await revokeAllForUser(id);
  sendSuccess(res, updated);
}

export async function analytics(_req: Request, res: Response) {
  sendSuccess(res, await getAdminAnalytics());
}

export async function readSettings(_req: Request, res: Response) {
  sendSuccess(res, await getSettings());
}

export async function writeSettings(req: Request, res: Response) {
  const parsed = academicSettingsSchema.parse(req.body);
  sendSuccess(res, await saveSettings(parsed));
}

export async function auditLogs(req: Request, res: Response) {
  const query = req.query as unknown as PageQuery;
  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { user: { select: { fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  sendSuccess(res, logs, 200, paginationMeta(total, query));
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export async function createNotice(req: Request, res: Response) {
  const user = requireUser(req);
  const body = req.body as {
    title: string;
    body: string;
    audience: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEPARTMENT';
    departmentId?: string | null;
    expiresAt?: string | null;
  };

  const notice = await prisma.notice.create({
    data: {
      title: body.title,
      body: body.body,
      audience: body.audience,
      departmentId: body.departmentId ?? null,
      authorId: user.id,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: notice.title,
      description: notice.body.slice(0, 280),
      type: 'NOTICE',
      startAt: notice.publishedAt,
      noticeId: notice.id,
      createdById: user.id,
    },
  });

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(body.audience === 'STUDENTS' ? { role: Role.STUDENT } : {}),
      ...(body.audience === 'TEACHERS' ? { role: Role.TEACHER } : {}),
      ...(body.audience === 'DEPARTMENT' && body.departmentId
        ? {
            OR: [
              { student: { departmentId: body.departmentId } },
              { teacher: { departmentId: body.departmentId } },
            ],
          }
        : {}),
    },
    select: { id: true },
  });

  await createNotificationsForMany(
    recipients.map((r) => r.id),
    {
      type: 'NOTICE',
      title: 'New notice from the department',
      message: notice.title,
      link: '/notices',
    },
  );

  sendSuccess(res, notice, 201);
}

export async function listNotices(_req: Request, res: Response) {
  const notices = await prisma.notice.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
    include: {
      author: { select: { fullName: true, role: true } },
      department: { select: { name: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  });
  sendSuccess(res, notices);
}

export async function deleteNotice(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.notice.delete({ where: { id } });
  sendSuccess(res, { message: 'Notice removed.' });
}
