import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/response';
import * as student from '../controllers/student.controller';
import * as teacher from '../controllers/teacher.controller';
import * as admin from '../controllers/admin.controller';
import * as calendar from '../controllers/calendar.controller';
import * as reference from '../controllers/reference.controller';
import * as report from '../controllers/report.controller';
import authRoutes from './auth.routes';
import {
  attendanceQuerySchema,
  attendanceSheetQuerySchema,
  calendarQuerySchema,
  createAssignmentSchema,
  createNoticeSchema,
  createStudentSchema,
  createSubjectSchema,
  createTeacherSchema,
  createTestSchema,
  gradeSubmissionSchema,
  idParam,
  markAttendanceSchema,
  paginationSchema,
  reportQuerySchema,
  settingsSchema,
  submitAssignmentSchema,
  testMarksSchema,
  trendQuerySchema,
  updateAssignmentSchema,
  updateAttendanceSchema,
  updateRoleSchema,
  updateStudentSchema,
  updateSubjectSchema,
  updateTeacherSchema,
  updateTestSchema,
  uuid,
} from '../validation/schemas';

const router = Router();

router.use('/auth', authRoutes);

// Reference lists power the sign-up form, so they are readable without a token.
router.get('/reference', asyncHandler(reference.getReferenceData));

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

const studentRouter = Router();
studentRouter.use(authenticate, authorize(Role.STUDENT));

studentRouter.get('/me', asyncHandler(student.getProfile));
studentRouter.get('/me/dashboard', asyncHandler(student.getDashboard));
studentRouter.get(
  '/me/attendance',
  validate({ query: attendanceQuerySchema }),
  asyncHandler(student.getAttendance),
);
studentRouter.get(
  '/me/attendance/trend',
  validate({ query: trendQuerySchema }),
  asyncHandler(student.getAttendanceTrendHandler),
);
studentRouter.get('/me/tests', asyncHandler(student.getTests));
studentRouter.get('/me/assignments', asyncHandler(student.getAssignments));
studentRouter.get('/me/subjects', asyncHandler(student.getSubjects));
studentRouter.post(
  '/me/assignments/:id/submit',
  validate({ params: idParam }),
  upload.single('file'),
  validate({ body: submitAssignmentSchema }),
  asyncHandler(student.submitAssignment),
);

router.use('/students', studentRouter);

// Notifications are shared by all roles.
const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get('/', asyncHandler(student.getNotifications));
notificationRouter.patch(
  '/:id/read',
  validate({ params: idParam }),
  asyncHandler(student.markNotificationRead),
);
notificationRouter.patch('/read-all', asyncHandler(student.markAllNotificationsRead));
router.use('/notifications', notificationRouter);

// Backwards-compatible alias used by the student dashboard.
router.get(
  '/students/me/notifications',
  authenticate,
  authorize(Role.STUDENT),
  asyncHandler(student.getNotifications),
);

// ---------------------------------------------------------------------------
// Teacher (admins may use every teacher endpoint too)
// ---------------------------------------------------------------------------

const teacherRouter = Router();
teacherRouter.use(authenticate, authorize(Role.TEACHER, Role.ADMIN));

teacherRouter.get('/dashboard', asyncHandler(teacher.getTeacherDashboard));
teacherRouter.get('/subjects', asyncHandler(teacher.getMySubjects));
teacherRouter.get(
  '/students',
  validate({ query: z.object({ subjectId: uuid.optional() }) }),
  asyncHandler(teacher.getStudentsForSubject),
);
teacherRouter.get(
  '/attendance/sheet',
  validate({ query: attendanceSheetQuerySchema }),
  asyncHandler(teacher.getAttendanceSheet),
);
teacherRouter.post(
  '/attendance',
  validate({ body: markAttendanceSchema }),
  asyncHandler(teacher.markAttendance),
);
teacherRouter.put(
  '/attendance/:id',
  validate({ params: idParam, body: updateAttendanceSchema }),
  asyncHandler(teacher.updateAttendance),
);

teacherRouter.get(
  '/tests',
  validate({ query: z.object({ subjectId: uuid.optional() }) }),
  asyncHandler(teacher.listTests),
);
teacherRouter.post('/tests', validate({ body: createTestSchema }), asyncHandler(teacher.createTest));
teacherRouter.put(
  '/tests/:id',
  validate({ params: idParam, body: updateTestSchema }),
  asyncHandler(teacher.updateTest),
);
teacherRouter.delete('/tests/:id', validate({ params: idParam }), asyncHandler(teacher.deleteTest));
teacherRouter.get(
  '/tests/:id/marks',
  validate({ params: idParam }),
  asyncHandler(teacher.getTestMarkSheet),
);
teacherRouter.post(
  '/tests/:id/marks',
  validate({ params: idParam, body: testMarksSchema }),
  asyncHandler(teacher.saveTestMarks),
);

teacherRouter.get(
  '/assignments',
  validate({ query: z.object({ subjectId: uuid.optional() }) }),
  asyncHandler(teacher.listAssignments),
);
teacherRouter.post(
  '/assignments',
  upload.single('attachment'),
  validate({ body: createAssignmentSchema }),
  asyncHandler(teacher.createAssignment),
);
teacherRouter.put(
  '/assignments/:id',
  validate({ params: idParam, body: updateAssignmentSchema }),
  asyncHandler(teacher.updateAssignment),
);
teacherRouter.delete(
  '/assignments/:id',
  validate({ params: idParam }),
  asyncHandler(teacher.deleteAssignment),
);
teacherRouter.get(
  '/assignments/:id/submissions',
  validate({ params: idParam }),
  asyncHandler(teacher.getSubmissions),
);
teacherRouter.post(
  '/assignments/:id/close',
  validate({ params: idParam }),
  asyncHandler(teacher.closeOverdueSubmissions),
);
teacherRouter.post(
  '/submissions/:id/grade',
  validate({ params: idParam, body: gradeSubmissionSchema }),
  asyncHandler(teacher.gradeSubmission),
);
teacherRouter.get(
  '/subjects/:subjectId/performance',
  validate({ params: z.object({ subjectId: uuid }) }),
  asyncHandler(teacher.getClassPerformance),
);

router.use('/teacher', teacherRouter);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const adminRouter = Router();
adminRouter.use(authenticate, authorize(Role.ADMIN));

const listQuery = paginationSchema.extend({
  departmentId: uuid.optional(),
  semesterId: uuid.optional(),
  sectionId: uuid.optional(),
});

adminRouter.get('/students', validate({ query: listQuery }), asyncHandler(admin.listStudents));
adminRouter.post(
  '/students',
  validate({ body: createStudentSchema }),
  asyncHandler(admin.createStudent),
);
adminRouter.put(
  '/students/:id',
  validate({ params: idParam, body: updateStudentSchema }),
  asyncHandler(admin.updateStudent),
);
adminRouter.delete(
  '/students/:id',
  validate({ params: idParam }),
  asyncHandler(admin.deleteStudent),
);

adminRouter.get('/teachers', validate({ query: listQuery }), asyncHandler(admin.listTeachers));
adminRouter.post(
  '/teachers',
  validate({ body: createTeacherSchema }),
  asyncHandler(admin.createTeacher),
);
adminRouter.put(
  '/teachers/:id',
  validate({ params: idParam, body: updateTeacherSchema }),
  asyncHandler(admin.updateTeacher),
);
adminRouter.delete(
  '/teachers/:id',
  validate({ params: idParam }),
  asyncHandler(admin.deleteTeacher),
);

adminRouter.get('/subjects', validate({ query: listQuery }), asyncHandler(admin.listSubjects));
adminRouter.post(
  '/subjects',
  validate({ body: createSubjectSchema }),
  asyncHandler(admin.createSubject),
);
adminRouter.put(
  '/subjects/:id',
  validate({ params: idParam, body: updateSubjectSchema }),
  asyncHandler(admin.updateSubject),
);
adminRouter.delete(
  '/subjects/:id',
  validate({ params: idParam }),
  asyncHandler(admin.deleteSubject),
);

adminRouter.get(
  '/users',
  validate({ query: paginationSchema.extend({ role: z.nativeEnum(Role).optional() }) }),
  asyncHandler(admin.listUsers),
);
adminRouter.patch(
  '/users/:id/role',
  validate({ params: idParam, body: updateRoleSchema }),
  asyncHandler(admin.updateUserRole),
);
adminRouter.patch(
  '/users/:id/active',
  validate({ params: idParam, body: z.object({ isActive: z.boolean() }) }),
  asyncHandler(admin.setUserActive),
);

adminRouter.get('/analytics', asyncHandler(admin.analytics));
adminRouter.get('/settings', asyncHandler(admin.readSettings));
adminRouter.put('/settings', validate({ body: settingsSchema }), asyncHandler(admin.writeSettings));
adminRouter.get('/audit-logs', validate({ query: paginationSchema }), asyncHandler(admin.auditLogs));
adminRouter.post('/notices', validate({ body: createNoticeSchema }), asyncHandler(admin.createNotice));
adminRouter.delete('/notices/:id', validate({ params: idParam }), asyncHandler(admin.deleteNotice));

router.use('/admin', adminRouter);

// Notices are readable by everyone who is signed in.
router.get('/notices', authenticate, asyncHandler(admin.listNotices));

// ---------------------------------------------------------------------------
// Calendar + reports
// ---------------------------------------------------------------------------

router.get(
  '/calendar',
  authenticate,
  validate({ query: calendarQuerySchema }),
  asyncHandler(calendar.listEvents),
);
router.post(
  '/calendar',
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN),
  asyncHandler(calendar.createEvent),
);
router.delete(
  '/calendar/:id',
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN),
  validate({ params: idParam }),
  asyncHandler(calendar.deleteEvent),
);

router.get(
  '/reports/:kind',
  authenticate,
  validate({
    params: z.object({
      kind: z.enum(['attendance', 'marks', 'assignments', 'performance', 'subject']),
    }),
    query: reportQuerySchema,
  }),
  asyncHandler(report.generateReport),
);

export default router;
