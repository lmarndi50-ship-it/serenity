import { api, deleteData, getData, getWithMeta, patchData, postData, putData, tokenStore } from './api';
import type {
  AdminAnalytics,
  AdminStudent,
  AdminSubject,
  AdminTeacher,
  AppSettings,
  AssignmentRow,
  AttendanceRecord,
  AttendanceSheet,
  AttendanceStatus,
  AuthUser,
  CalendarEventItem,
  ClassPerformance,
  LoginResponse,
  NoticeItem,
  Notification,
  ReferenceData,
  Role,
  StudentDashboard,
  StudentSubject,
  SubjectAttendanceRow,
  SubmissionRow,
  TeacherAssignment,
  TeacherDashboard,
  TeacherSubject,
  TeacherTest,
  TestMarkRow,
  TestMarkSheet,
  TrendPoint,
} from '@/types';

// ---------------------------------------------------------------------------
// authService
// ---------------------------------------------------------------------------

export const authService = {
  async login(identifier: string, password: string, rememberMe = false): Promise<LoginResponse> {
    const data = await postData<LoginResponse>('/auth/login', { identifier, password, rememberMe });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },

  async register(payload: Record<string, unknown>): Promise<LoginResponse> {
    const data = await postData<LoginResponse>('/auth/register', payload);
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },

  me: () => getData<AuthUser>('/auth/me'),

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', { refreshToken: tokenStore.refresh });
    } finally {
      tokenStore.clear();
    }
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    postData<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
};

// ---------------------------------------------------------------------------
// referenceService
// ---------------------------------------------------------------------------

export const referenceService = {
  get: () => getData<ReferenceData>('/reference'),
};

// ---------------------------------------------------------------------------
// studentService
// ---------------------------------------------------------------------------

export const studentService = {
  dashboard: () => getData<StudentDashboard>('/students/me/dashboard'),

  profile: () => getData<Record<string, unknown>>('/students/me'),

  attendance: (params?: { subjectId?: string; from?: string; to?: string }) =>
    getData<{
      subjects: SubjectAttendanceRow[];
      overall: {
        present: number;
        absent: number;
        leave: number;
        total: number;
        considered: number;
        percentage: number;
      };
      records: AttendanceRecord[];
    }>('/students/me/attendance', params),

  attendanceTrend: (range: '4w' | '8w' | 'semester') =>
    getData<TrendPoint[]>('/students/me/attendance/trend', { range }),

  tests: () =>
    getData<{
      marks: TestMarkRow[];
      average: number;
      upcoming: { id: string; subject: string; name: string; testDate: string; maxMarks: number }[];
    }>('/students/me/tests'),

  assignments: () => getData<{ assignments: AssignmentRow[] }>('/students/me/assignments'),

  subjects: () => getData<StudentSubject[]>('/students/me/subjects'),

  submitAssignment: async (assignmentId: string, payload: { contentText?: string; file?: File }) => {
    const form = new FormData();
    if (payload.contentText) form.append('contentText', payload.contentText);
    if (payload.file) form.append('file', payload.file);
    const response = await api.post(`/students/me/assignments/${assignmentId}/submit`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};

// ---------------------------------------------------------------------------
// notificationService
// ---------------------------------------------------------------------------

export const notificationService = {
  list: () => getData<{ notifications: Notification[]; unread: number }>('/notifications'),
  markRead: (id: string) => patchData<{ message: string }>(`/notifications/${id}/read`),
  markAllRead: () => patchData<{ updated: number }>('/notifications/read-all'),
};

// ---------------------------------------------------------------------------
// calendarService / noticeService
// ---------------------------------------------------------------------------

export const calendarService = {
  list: (params?: { from?: string; to?: string; type?: string }) =>
    getData<CalendarEventItem[]>('/calendar', params),
  create: (payload: Record<string, unknown>) => postData<CalendarEventItem>('/calendar', payload),
  remove: (id: string) => deleteData<{ message: string }>(`/calendar/${id}`),
};

export const noticeService = {
  list: () => getData<NoticeItem[]>('/notices'),
  create: (payload: Record<string, unknown>) => postData<NoticeItem>('/admin/notices', payload),
  remove: (id: string) => deleteData<{ message: string }>(`/admin/notices/${id}`),
};

// ---------------------------------------------------------------------------
// teacherService
// ---------------------------------------------------------------------------

export const teacherService = {
  dashboard: () => getData<TeacherDashboard>('/teacher/dashboard'),

  subjects: () => getData<TeacherSubject[]>('/teacher/subjects'),

  students: (subjectId: string) =>
    getData<
      { studentId: string; rollNumber: string; name: string; email: string; section: string }[]
    >('/teacher/students', { subjectId }),

  attendanceSheet: (subjectId: string, date: string, period: number) =>
    getData<AttendanceSheet>('/teacher/attendance/sheet', { subjectId, date, period }),

  markAttendance: (payload: {
    subjectId: string;
    date: string;
    period: number;
    entries: { studentId: string; status: AttendanceStatus; remarks?: string }[];
  }) => postData<{ saved: number; date: string; period: number }>('/teacher/attendance', payload),

  updateAttendance: (id: string, status: AttendanceStatus, remarks?: string) =>
    putData(`/teacher/attendance/${id}`, { status, remarks }),

  tests: (subjectId?: string) =>
    getData<TeacherTest[]>('/teacher/tests', subjectId ? { subjectId } : undefined),

  createTest: (payload: Record<string, unknown>) => postData<TeacherTest>('/teacher/tests', payload),

  updateTest: (id: string, payload: Record<string, unknown>) =>
    putData<TeacherTest>(`/teacher/tests/${id}`, payload),

  deleteTest: (id: string) => deleteData<{ message: string }>(`/teacher/tests/${id}`),

  testMarkSheet: (id: string) => getData<TestMarkSheet>(`/teacher/tests/${id}/marks`),

  saveTestMarks: (
    id: string,
    marks: { studentId: string; obtainedMarks: number; isAbsent?: boolean }[],
    publish: boolean,
  ) => postData<{ saved: number; published: boolean }>(`/teacher/tests/${id}/marks`, { marks, publish }),

  assignments: (subjectId?: string) =>
    getData<TeacherAssignment[]>('/teacher/assignments', subjectId ? { subjectId } : undefined),

  createAssignment: async (payload: {
    subjectId: string;
    title: string;
    description?: string;
    dueDate: string;
    maxMarks: number;
    attachment?: File;
  }) => {
    const form = new FormData();
    form.append('subjectId', payload.subjectId);
    form.append('title', payload.title);
    if (payload.description) form.append('description', payload.description);
    form.append('dueDate', payload.dueDate);
    form.append('maxMarks', String(payload.maxMarks));
    if (payload.attachment) form.append('attachment', payload.attachment);
    const response = await api.post('/teacher/assignments', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  updateAssignment: (id: string, payload: Record<string, unknown>) =>
    putData(`/teacher/assignments/${id}`, payload),

  deleteAssignment: (id: string) => deleteData<{ message: string }>(`/teacher/assignments/${id}`),

  submissions: (assignmentId: string) =>
    getData<{
      assignment: { id: string; title: string; dueDate: string; maxMarks: number; subject: string };
      submissions: SubmissionRow[];
    }>(`/teacher/assignments/${assignmentId}/submissions`),

  gradeSubmission: (submissionId: string, obtainedMarks: number, feedback?: string) =>
    postData(`/teacher/submissions/${submissionId}/grade`, { obtainedMarks, feedback }),

  classPerformance: (subjectId: string) =>
    getData<ClassPerformance>(`/teacher/subjects/${subjectId}/performance`),
};

// ---------------------------------------------------------------------------
// adminService
// ---------------------------------------------------------------------------

export const adminService = {
  analytics: () => getData<AdminAnalytics>('/admin/analytics'),

  students: (params: Record<string, unknown>) =>
    getWithMeta<AdminStudent[]>('/admin/students', params),
  createStudent: (payload: Record<string, unknown>) => postData('/admin/students', payload),
  updateStudent: (id: string, payload: Record<string, unknown>) =>
    putData(`/admin/students/${id}`, payload),
  deleteStudent: (id: string) => deleteData(`/admin/students/${id}`),

  teachers: (params: Record<string, unknown>) =>
    getWithMeta<AdminTeacher[]>('/admin/teachers', params),
  createTeacher: (payload: Record<string, unknown>) => postData('/admin/teachers', payload),
  updateTeacher: (id: string, payload: Record<string, unknown>) =>
    putData(`/admin/teachers/${id}`, payload),
  deleteTeacher: (id: string) => deleteData(`/admin/teachers/${id}`),

  subjects: (params: Record<string, unknown>) =>
    getWithMeta<AdminSubject[]>('/admin/subjects', params),
  createSubject: (payload: Record<string, unknown>) => postData('/admin/subjects', payload),
  updateSubject: (id: string, payload: Record<string, unknown>) =>
    putData(`/admin/subjects/${id}`, payload),
  deleteSubject: (id: string) => deleteData(`/admin/subjects/${id}`),

  users: (params: Record<string, unknown>) =>
    getWithMeta<
      {
        id: string;
        email: string;
        fullName: string;
        role: Role;
        isActive: boolean;
        lastLoginAt: string | null;
        createdAt: string;
      }[]
    >('/admin/users', params),
  updateUserRole: (id: string, role: Role) => patchData(`/admin/users/${id}/role`, { role }),
  setUserActive: (id: string, isActive: boolean) =>
    patchData(`/admin/users/${id}/active`, { isActive }),

  settings: () => getData<AppSettings>('/admin/settings'),
  saveSettings: (payload: AppSettings) => putData<AppSettings>('/admin/settings', payload),

  auditLogs: (params: Record<string, unknown>) =>
    getWithMeta<
      {
        id: string;
        action: string;
        entity: string;
        entityId: string | null;
        createdAt: string;
        user: { fullName: string; email: string; role: Role } | null;
      }[]
    >('/admin/audit-logs', params),
};
