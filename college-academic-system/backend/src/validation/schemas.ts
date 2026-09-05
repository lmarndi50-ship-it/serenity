import { z } from 'zod';

export const uuid = z.string().uuid('A valid identifier is required.');

export const idParam = z.object({ id: uuid });

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

export const rollNumberSchema = z
  .string()
  .trim()
  .min(3, 'Roll number is too short.')
  .max(20, 'Roll number is too long.')
  .regex(/^[A-Za-z0-9-]+$/, 'Roll number may only contain letters, numbers and hyphens.');

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  // Accepts either an email address or a roll number.
  identifier: z.string().trim().min(3, 'Enter your email address or roll number.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: passwordSchema,
  phone: z.string().trim().min(7).max(20).optional(),
  rollNumber: rollNumberSchema,
  registrationNo: z.string().trim().min(3).max(30),
  admissionYear: z.coerce.number().int().min(1990).max(2100),
  departmentId: uuid,
  courseId: uuid,
  semesterId: uuid,
  sectionId: uuid,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: passwordSchema,
});

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export const attendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LEAVE']);

export const markAttendanceSchema = z.object({
  subjectId: uuid,
  date: dateOnlySchema,
  period: z.coerce.number().int().min(1).max(10).default(1),
  entries: z
    .array(
      z.object({
        studentId: uuid,
        status: attendanceStatusSchema,
        remarks: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, 'Mark at least one student.'),
});

export const updateAttendanceSchema = z.object({
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(200).optional(),
});

export const attendanceQuerySchema = z.object({
  subjectId: uuid.optional(),
  semesterId: uuid.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export const attendanceSheetQuerySchema = z.object({
  subjectId: uuid,
  date: dateOnlySchema,
  period: z.coerce.number().int().min(1).max(10).default(1),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export const createTestSchema = z.object({
  subjectId: uuid,
  name: z.string().trim().min(2, 'Enter a test name.').max(80),
  description: z.string().trim().max(500).optional(),
  testDate: dateOnlySchema,
  maxMarks: z.coerce.number().int().min(1, 'Maximum marks must be at least 1.').max(500),
  isPublished: z.boolean().optional().default(false),
});

export const updateTestSchema = createTestSchema.partial().omit({ subjectId: true });

export const testMarksSchema = z.object({
  marks: z
    .array(
      z.object({
        studentId: uuid,
        obtainedMarks: z.coerce
          .number()
          .min(0, 'Marks cannot be negative.')
          .max(500),
        isAbsent: z.boolean().optional().default(false),
        remarks: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, 'Enter marks for at least one student.'),
  publish: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export const createAssignmentSchema = z.object({
  subjectId: uuid,
  title: z.string().trim().min(3, 'Enter an assignment title.').max(140),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().datetime({ offset: true }).or(dateOnlySchema),
  maxMarks: z.coerce.number().int().min(1).max(200),
});

export const updateAssignmentSchema = createAssignmentSchema.partial().omit({ subjectId: true });

export const gradeSubmissionSchema = z.object({
  obtainedMarks: z.coerce.number().min(0, 'Marks cannot be negative.'),
  feedback: z.string().trim().max(1000).optional(),
});

export const submitAssignmentSchema = z.object({
  contentText: z.string().trim().max(5000).optional(),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const createStudentSchema = registerSchema;

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
  rollNumber: rollNumberSchema.optional(),
  registrationNo: z.string().trim().min(3).max(30).optional(),
  admissionYear: z.coerce.number().int().min(1990).max(2100).optional(),
  departmentId: uuid.optional(),
  courseId: uuid.optional(),
  semesterId: uuid.optional(),
  sectionId: uuid.optional(),
  isActive: z.boolean().optional(),
});

export const createTeacherSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  phone: z.string().trim().min(7).max(20).optional(),
  employeeCode: z.string().trim().min(2).max(20),
  designation: z.string().trim().max(80).optional(),
  qualification: z.string().trim().max(120).optional(),
  departmentId: uuid,
});

export const updateTeacherSchema = createTeacherSchema.partial().omit({ password: true });

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(20),
  credits: z.coerce.number().int().min(1).max(10).default(4),
  totalPlannedClasses: z.coerce.number().int().min(1).max(200).default(45),
  departmentId: uuid,
  courseId: uuid,
  semesterId: uuid,
  sectionId: uuid,
  teacherId: uuid.optional().nullable(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const updateRoleSchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
});

export const settingsSchema = z.object({
  weights: z.object({
    attendance: z.coerce.number().min(0).max(1),
    tests: z.coerce.number().min(0).max(1),
    assignments: z.coerce.number().min(0).max(1),
  }),
  thresholds: z.object({
    good: z.coerce.number().min(1).max(100),
    warning: z.coerce.number().min(1).max(100),
  }),
  collegeName: z.string().trim().min(2).max(120),
});

// ---------------------------------------------------------------------------
// Notices, events, notifications
// ---------------------------------------------------------------------------

export const createNoticeSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(4000),
  audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'DEPARTMENT']).default('ALL'),
  departmentId: uuid.optional().nullable(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const calendarQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).or(dateOnlySchema).optional(),
  to: z.string().datetime({ offset: true }).or(dateOnlySchema).optional(),
  type: z.enum(['TEST', 'ASSIGNMENT', 'EXAM', 'EVENT', 'NOTICE', 'HOLIDAY']).optional(),
});

export const trendQuerySchema = z.object({
  range: z.enum(['4w', '8w', 'semester']).default('8w'),
});

export const reportQuerySchema = z.object({
  format: z.enum(['pdf', 'excel']).default('pdf'),
  studentId: uuid.optional(),
  subjectId: uuid.optional(),
  semesterId: uuid.optional(),
});
