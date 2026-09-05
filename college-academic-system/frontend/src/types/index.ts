export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE';
export type AttendanceHealth = 'GOOD' | 'WARNING' | 'CRITICAL';
export type SubmissionStatus = 'NOT_SUBMITTED' | 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED';
export type EventType = 'TEST' | 'ASSIGNMENT' | 'EXAM' | 'EVENT' | 'NOTICE' | 'HOLIDAY';
export type NotificationType = 'ATTENDANCE' | 'TEST' | 'ASSIGNMENT' | 'NOTICE' | 'GENERAL';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface NamedRef {
  id: string;
  name: string;
  code?: string;
  number?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  avatarUrl: string | null;
  student: {
    id: string;
    rollNumber: string;
    registrationNo: string;
    admissionYear: number;
    department: NamedRef;
    course: NamedRef;
    semester: NamedRef;
    section: NamedRef;
  } | null;
  teacher: {
    id: string;
    employeeCode: string;
    designation: string;
    department: NamedRef;
  } | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface StudentSummary {
  attendance: {
    present: number;
    absent: number;
    leave: number;
    total: number;
    considered: number;
    percentage: number;
    status: AttendanceHealth;
  };
  tests: { obtained: number; max: number; percentage: number; count: number };
  assignments: {
    total: number;
    submitted: number;
    pending: number;
    late: number;
    notSubmitted: number;
    graded: number;
    obtained: number;
    max: number;
    marksPercentage: number;
    submissionRate: number;
  };
  overall: number;
  weights: { attendance: number; tests: number; assignments: number };
  thresholds: { good: number; warning: number };
}

export interface SubjectAttendanceRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  present: number;
  absent: number;
  leave: number;
  total: number;
  percentage: number;
  status: AttendanceHealth;
}

export interface TrendPoint {
  weekStart: string;
  label: string;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

export interface UpcomingItem {
  id: string;
  type: EventType;
  title: string;
  subject: string | null;
  date: string;
}

export interface TestMarkRow {
  id: string;
  testId?: string;
  subject: string;
  subjectCode: string;
  faculty?: string;
  testName: string;
  testDate: string;
  obtainedMarks: number;
  maxMarks: number;
  isAbsent: boolean;
  percentage: number;
  remarks?: string | null;
}

export interface AssignmentRow {
  id: string;
  assignmentId?: string;
  subject: string;
  subjectCode: string;
  faculty?: string;
  title: string;
  description?: string | null;
  dueDate: string;
  maxMarks: number;
  attachmentUrl?: string | null;
  status: SubmissionStatus;
  submittedAt?: string | null;
  fileUrl?: string | null;
  contentText?: string | null;
  obtainedMarks: number | null;
  feedback?: string | null;
}

export interface StudentDashboard {
  summary: StudentSummary;
  subjectAttendance: SubjectAttendanceRow[];
  attendanceTrend: TrendPoint[];
  upcoming: UpcomingItem[];
  semester: { name: string; number: number } | null;
  unreadNotifications: number;
  recentTests: TestMarkRow[];
  recentAssignments: AssignmentRow[];
}

export interface StudentSubject {
  id: string;
  name: string;
  code: string;
  credits: number;
  totalPlannedClasses: number;
  faculty: string;
  facultyEmail: string | null;
  semester: string;
  section: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  period: number;
  status: AttendanceStatus;
  remarks: string | null;
  subject: string;
  subjectCode: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  startAt: string;
  endAt: string | null;
  location: string | null;
  subject: string | null;
  subjectCode: string | null;
  faculty: string | null;
  maxMarks: number | null;
}

export interface NoticeItem {
  id: string;
  title: string;
  body: string;
  audience: string;
  publishedAt: string;
  author: { fullName: string; role: Role } | null;
  department: { name: string } | null;
}

// --- teacher ---

export interface TeacherSubject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: string;
  semesterNumber: number;
  section: string;
  department: string;
  studentCount: number;
  testCount: number;
  assignmentCount: number;
}

export interface AttendanceSheet {
  subjectId: string;
  date: string;
  period: number;
  alreadyMarked: boolean;
  students: {
    studentId: string;
    rollNumber: string;
    name: string;
    status: AttendanceStatus | null;
    remarks: string | null;
    attendanceId: string | null;
  }[];
}

export interface TeacherTest {
  id: string;
  name: string;
  description: string | null;
  testDate: string;
  maxMarks: number;
  isPublished: boolean;
  subjectId: string;
  subject: string;
  subjectCode: string;
  marksEntered: number;
}

export interface TestMarkSheet {
  test: {
    id: string;
    name: string;
    testDate: string;
    maxMarks: number;
    isPublished: boolean;
    subject: string;
    subjectCode: string;
  };
  students: {
    studentId: string;
    rollNumber: string;
    name: string;
    obtainedMarks: number | null;
    isAbsent: boolean;
    remarks: string | null;
  }[];
}

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  maxMarks: number;
  attachmentUrl: string | null;
  subjectId: string;
  subject: string;
  subjectCode: string;
  totalStudents: number;
  submitted: number;
  graded: number;
  submissionRate: number;
}

export interface SubmissionRow {
  id: string;
  studentId: string;
  rollNumber: string;
  name: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  fileUrl: string | null;
  contentText: string | null;
  obtainedMarks: number | null;
  feedback: string | null;
}

export interface TeacherDashboard {
  kpis: {
    assignedSubjects: number;
    totalStudents: number;
    attendancePending: number;
    pendingGrading: number;
    unreadNotifications: number;
  };
  subjects: {
    id: string;
    name: string;
    code: string;
    semester: string;
    section: string;
    studentCount: number;
    attendanceMarkedToday: boolean;
  }[];
  recentTests: {
    id: string;
    name: string;
    subject: string;
    testDate: string;
    maxMarks: number;
    isPublished: boolean;
    marksEntered: number;
  }[];
  upcomingDeadlines: { id: string; title: string; subject: string; dueDate: string }[];
}

export interface ClassPerformance {
  subject: {
    id: string;
    name: string;
    code: string;
    faculty: string;
    semester: string;
    section: string;
    department: string;
  };
  classAttendance: number;
  classTestAverage: number;
  averageSubmissionRate: number;
  students: {
    studentId: string;
    rollNumber: string;
    name: string;
    attendancePercentage: number;
    attendanceStatus: AttendanceHealth;
    testPercentage: number;
    submissionRate: number;
  }[];
}

// --- admin ---

export interface AdminAnalytics {
  kpis: {
    totalStudents: number;
    totalTeachers: number;
    totalSubjects: number;
    totalDepartments: number;
    averageAttendance: number;
    averageTestScore: number;
    assignmentSubmissionRate: number;
  };
  departmentAttendance: { department: string; percentage: number; students: number }[];
  semesterPerformance: { semester: string; attendance: number; tests: number }[];
  monthlyAttendance: { month: string; percentage: number }[];
  assignmentSubmission: { status: string; count: number }[];
  testDistribution: { band: string; count: number }[];
}

export interface AdminStudent {
  id: string;
  userId: string;
  rollNumber: string;
  registrationNo: string;
  admissionYear: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  department: string;
  departmentId: string;
  course: string;
  courseId: string;
  semester: string;
  semesterId: string;
  section: string;
  sectionId: string;
}

export interface AdminTeacher {
  id: string;
  userId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  designation: string;
  qualification: string | null;
  department: string;
  departmentId: string;
  subjectCount: number;
}

export interface AdminSubject {
  id: string;
  name: string;
  code: string;
  credits: number;
  totalPlannedClasses: number;
  faculty: string | null;
  teacherId: string | null;
  department: string;
  departmentId: string;
  course: string;
  courseId: string;
  semester: string;
  semesterId: string;
  section: string;
  sectionId: string;
  studentCount: number;
}

export interface AppSettings {
  weights: { attendance: number; tests: number; assignments: number };
  thresholds: { good: number; warning: number };
  collegeName: string;
}

export interface ReferenceData {
  departments: { id: string; name: string; code: string }[];
  courses: { id: string; name: string; code: string; departmentId: string }[];
  semesters: { id: string; name: string; number: number; sessionId: string }[];
  sections: { id: string; name: string }[];
  sessions: { id: string; name: string; isCurrent: boolean }[];
  collegeName: string;
  thresholds: { good: number; warning: number };
  weights: { attendance: number; tests: number; assignments: number };
}
