import { prisma } from '../utils/prisma';
import {
  attendanceHealth,
  formatDateOnly,
  marksPercentage,
  overallScore,
  percentage,
  round1,
  startOfIsoWeek,
  tallyAttendance,
  type AttendanceHealth,
} from '../utils/academics';
import { getSettings } from './settings.service';

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

/** Per-subject attendance breakdown for one student. */
export async function getSubjectAttendance(studentId: string): Promise<SubjectAttendanceRow[]> {
  const [enrollments, records, settings] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId },
      include: {
        subject: {
          include: { teacher: { include: { user: { select: { fullName: true } } } } },
        },
      },
      orderBy: { subject: { name: 'asc' } },
    }),
    prisma.attendance.findMany({
      where: { studentId },
      select: { subjectId: true, status: true },
    }),
    getSettings(),
  ]);

  const bySubject = new Map<string, { status: (typeof records)[number]['status'] }[]>();
  for (const r of records) {
    const list = bySubject.get(r.subjectId) ?? [];
    list.push({ status: r.status });
    bySubject.set(r.subjectId, list);
  }

  return enrollments.map((e) => {
    const tally = tallyAttendance(bySubject.get(e.subjectId) ?? []);
    return {
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      subjectCode: e.subject.code,
      facultyName: e.subject.teacher?.user.fullName ?? 'Not assigned',
      present: tally.present,
      absent: tally.absent,
      leave: tally.leave,
      total: tally.total,
      percentage: tally.percentage,
      status: attendanceHealth(tally.percentage, settings.thresholds),
    };
  });
}

/** Headline KPI numbers for a student, computed entirely from stored records. */
export async function getStudentSummary(studentId: string): Promise<StudentSummary> {
  const settings = await getSettings();

  const [attendanceRecords, testMarks, submissions, assignmentCount] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId }, select: { status: true } }),
    prisma.testMark.findMany({
      where: { studentId, test: { isPublished: true } },
      select: { obtainedMarks: true, isAbsent: true, test: { select: { maxMarks: true } } },
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId },
      select: {
        status: true,
        obtainedMarks: true,
        assignment: { select: { maxMarks: true } },
      },
    }),
    prisma.assignmentSubmission.count({ where: { studentId } }),
  ]);

  const attendance = tallyAttendance(attendanceRecords);

  const tests = marksPercentage(
    testMarks.map((m) => ({
      obtained: m.isAbsent ? 0 : m.obtainedMarks,
      max: m.test.maxMarks,
    })),
  );

  let submitted = 0;
  let pending = 0;
  let late = 0;
  let notSubmitted = 0;
  let graded = 0;
  const gradedRows: { obtained: number; max: number }[] = [];

  for (const s of submissions) {
    switch (s.status) {
      case 'SUBMITTED':
        submitted += 1;
        break;
      case 'LATE':
        late += 1;
        submitted += 1;
        break;
      case 'GRADED':
        graded += 1;
        submitted += 1;
        break;
      case 'NOT_SUBMITTED':
        notSubmitted += 1;
        break;
      default:
        pending += 1;
    }
    if (s.obtainedMarks !== null && s.obtainedMarks !== undefined) {
      gradedRows.push({ obtained: s.obtainedMarks, max: s.assignment.maxMarks });
    }
  }

  const assignmentMarks = marksPercentage(gradedRows);
  const submissionRate = percentage(submitted, assignmentCount);

  // A student with no graded assignments yet is scored on submission rate, so
  // the overall figure is not dragged to zero before any marking happens.
  const assignmentScore = gradedRows.length > 0 ? assignmentMarks.percentage : submissionRate;

  return {
    attendance: {
      ...attendance,
      status: attendanceHealth(attendance.percentage, settings.thresholds),
    },
    tests: { ...tests, count: testMarks.length },
    assignments: {
      total: assignmentCount,
      submitted,
      pending,
      late,
      notSubmitted,
      graded,
      obtained: assignmentMarks.obtained,
      max: assignmentMarks.max,
      marksPercentage: assignmentMarks.percentage,
      submissionRate,
    },
    overall: overallScore(
      {
        attendance: attendance.percentage,
        tests: tests.percentage,
        assignments: assignmentScore,
      },
      settings.weights,
    ),
    weights: settings.weights,
    thresholds: settings.thresholds,
  };
}

export interface TrendPoint {
  weekStart: string;
  label: string;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

/** Weekly attendance trend, bucketed Monday-to-Sunday. */
export async function getAttendanceTrend(
  studentId: string,
  range: '4w' | '8w' | 'semester',
): Promise<TrendPoint[]> {
  let since: Date | undefined;
  if (range === '4w' || range === '8w') {
    const weeks = range === '4w' ? 4 : 8;
    const start = startOfIsoWeek(new Date());
    start.setUTCDate(start.getUTCDate() - (weeks - 1) * 7);
    since = start;
  } else {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { semester: { select: { startDate: true } } },
    });
    since = student?.semester.startDate;
  }

  const records = await prisma.attendance.findMany({
    where: { studentId, ...(since ? { date: { gte: since } } : {}) },
    select: { date: true, status: true },
    orderBy: { date: 'asc' },
  });

  const buckets = new Map<string, { present: number; absent: number; leave: number }>();
  for (const r of records) {
    const key = formatDateOnly(startOfIsoWeek(r.date));
    const bucket = buckets.get(key) ?? { present: 0, absent: 0, leave: 0 };
    if (r.status === 'PRESENT') bucket.present += 1;
    else if (r.status === 'ABSENT') bucket.absent += 1;
    else bucket.leave += 1;
    buckets.set(key, bucket);
  }

  const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([weekStart, b], index) => ({
    weekStart,
    label: `Week ${index + 1}`,
    present: b.present,
    absent: b.absent,
    leave: b.leave,
    percentage: percentage(b.present, b.present + b.absent),
  }));
}

export interface UpcomingItem {
  id: string;
  type: 'TEST' | 'ASSIGNMENT' | 'EXAM' | 'EVENT' | 'NOTICE' | 'HOLIDAY';
  title: string;
  subject: string | null;
  date: string;
}

/** Next tests, assignment deadlines and events for a student's subjects. */
export async function getUpcoming(studentId: string, limit = 6): Promise<UpcomingItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { subjectId: true },
  });
  const subjectIds = enrollments.map((e) => e.subjectId);
  const now = new Date();

  const events = await prisma.calendarEvent.findMany({
    where: {
      startAt: { gte: now },
      OR: [{ subjectId: { in: subjectIds } }, { subjectId: null }],
    },
    include: { subject: { select: { name: true } } },
    orderBy: { startAt: 'asc' },
    take: limit,
  });

  return events.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    subject: e.subject?.name ?? null,
    date: e.startAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Admin / institution-wide analytics
// ---------------------------------------------------------------------------

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

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [
    totalStudents,
    totalTeachers,
    totalSubjects,
    totalDepartments,
    attendanceRows,
    testMarkRows,
    submissionRows,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.subject.count(),
    prisma.department.count(),
    prisma.attendance.findMany({
      select: {
        status: true,
        date: true,
        student: {
          select: {
            department: { select: { name: true } },
            semester: { select: { name: true, number: true } },
          },
        },
      },
    }),
    prisma.testMark.findMany({
      select: {
        obtainedMarks: true,
        isAbsent: true,
        test: { select: { maxMarks: true } },
        student: { select: { semester: { select: { name: true, number: true } } } },
      },
    }),
    prisma.assignmentSubmission.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const overallTally = tallyAttendance(attendanceRows);

  // Department-wise attendance
  const deptMap = new Map<string, { present: number; absent: number; students: Set<string> }>();
  const monthMap = new Map<string, { present: number; absent: number }>();
  const semAttendance = new Map<string, { present: number; absent: number; order: number }>();

  for (const row of attendanceRows) {
    const dept = row.student.department.name;
    const d = deptMap.get(dept) ?? { present: 0, absent: 0, students: new Set<string>() };
    if (row.status === 'PRESENT') d.present += 1;
    else if (row.status === 'ABSENT') d.absent += 1;
    deptMap.set(dept, d);

    const monthKey = row.date.toISOString().slice(0, 7);
    const m = monthMap.get(monthKey) ?? { present: 0, absent: 0 };
    if (row.status === 'PRESENT') m.present += 1;
    else if (row.status === 'ABSENT') m.absent += 1;
    monthMap.set(monthKey, m);

    const semName = row.student.semester.name;
    const s = semAttendance.get(semName) ?? {
      present: 0,
      absent: 0,
      order: row.student.semester.number,
    };
    if (row.status === 'PRESENT') s.present += 1;
    else if (row.status === 'ABSENT') s.absent += 1;
    semAttendance.set(semName, s);
  }

  const studentsByDept = await prisma.student.groupBy({
    by: ['departmentId'],
    _count: { _all: true },
  });
  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const deptStudentCount = new Map(
    studentsByDept.map((r) => [
      departments.find((d) => d.id === r.departmentId)?.name ?? 'Unknown',
      r._count._all,
    ]),
  );

  // Semester-wise test performance
  const semTests = new Map<string, { obtained: number; max: number; order: number }>();
  const bands = { '0-39': 0, '40-49': 0, '50-59': 0, '60-74': 0, '75-89': 0, '90-100': 0 };

  for (const m of testMarkRows) {
    const obtained = m.isAbsent ? 0 : m.obtainedMarks;
    const semName = m.student.semester.name;
    const entry = semTests.get(semName) ?? {
      obtained: 0,
      max: 0,
      order: m.student.semester.number,
    };
    entry.obtained += obtained;
    entry.max += m.test.maxMarks;
    semTests.set(semName, entry);

    const pct = percentage(obtained, m.test.maxMarks);
    if (pct < 40) bands['0-39'] += 1;
    else if (pct < 50) bands['40-49'] += 1;
    else if (pct < 60) bands['50-59'] += 1;
    else if (pct < 75) bands['60-74'] += 1;
    else if (pct < 90) bands['75-89'] += 1;
    else bands['90-100'] += 1;
  }

  const testTotals = testMarkRows.reduce(
    (acc, m) => ({
      obtained: acc.obtained + (m.isAbsent ? 0 : m.obtainedMarks),
      max: acc.max + m.test.maxMarks,
    }),
    { obtained: 0, max: 0 },
  );

  const totalSubmissions = submissionRows.reduce((a, r) => a + r._count._all, 0);
  const submittedCount = submissionRows
    .filter((r) => r.status === 'SUBMITTED' || r.status === 'LATE' || r.status === 'GRADED')
    .reduce((a, r) => a + r._count._all, 0);

  const semesterNames = new Set([...semAttendance.keys(), ...semTests.keys()]);

  return {
    kpis: {
      totalStudents,
      totalTeachers,
      totalSubjects,
      totalDepartments,
      averageAttendance: overallTally.percentage,
      averageTestScore: percentage(testTotals.obtained, testTotals.max),
      assignmentSubmissionRate: percentage(submittedCount, totalSubmissions),
    },
    departmentAttendance: [...deptMap.entries()]
      .map(([department, v]) => ({
        department,
        percentage: percentage(v.present, v.present + v.absent),
        students: deptStudentCount.get(department) ?? 0,
      }))
      .sort((a, b) => b.percentage - a.percentage),
    semesterPerformance: [...semesterNames]
      .map((name) => {
        const att = semAttendance.get(name);
        const tst = semTests.get(name);
        return {
          semester: name,
          attendance: att ? percentage(att.present, att.present + att.absent) : 0,
          tests: tst ? percentage(tst.obtained, tst.max) : 0,
          order: att?.order ?? tst?.order ?? 0,
        };
      })
      .sort((a, b) => a.order - b.order)
      .map(({ semester, attendance, tests }) => ({ semester, attendance, tests })),
    monthlyAttendance: [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        percentage: percentage(v.present, v.present + v.absent),
      })),
    assignmentSubmission: submissionRows.map((r) => ({
      status: r.status,
      count: r._count._all,
    })),
    testDistribution: Object.entries(bands).map(([band, count]) => ({ band, count })),
  };
}

/** Class-level performance for one subject, used by teacher reports. */
export async function getSubjectPerformance(subjectId: string) {
  const [subject, attendance, tests, assignments, settings] = await Promise.all([
    prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        teacher: { include: { user: { select: { fullName: true } } } },
        semester: true,
        section: true,
        department: true,
      },
    }),
    prisma.attendance.findMany({
      where: { subjectId },
      select: {
        status: true,
        studentId: true,
        student: {
          select: { rollNumber: true, user: { select: { fullName: true } } },
        },
      },
    }),
    prisma.testMark.findMany({
      where: { test: { subjectId } },
      select: {
        obtainedMarks: true,
        isAbsent: true,
        studentId: true,
        test: { select: { maxMarks: true, name: true } },
      },
    }),
    prisma.assignmentSubmission.findMany({
      where: { assignment: { subjectId } },
      select: {
        status: true,
        obtainedMarks: true,
        studentId: true,
        assignment: { select: { maxMarks: true } },
      },
    }),
    getSettings(),
  ]);

  if (!subject) return null;

  const byStudent = new Map<
    string,
    {
      rollNumber: string;
      name: string;
      present: number;
      absent: number;
      leave: number;
      testObtained: number;
      testMax: number;
      submitted: number;
      assignmentTotal: number;
    }
  >();

  const ensure = (id: string, rollNumber = '', name = '') => {
    const existing = byStudent.get(id);
    if (existing) return existing;
    const created = {
      rollNumber,
      name,
      present: 0,
      absent: 0,
      leave: 0,
      testObtained: 0,
      testMax: 0,
      submitted: 0,
      assignmentTotal: 0,
    };
    byStudent.set(id, created);
    return created;
  };

  for (const a of attendance) {
    const row = ensure(a.studentId, a.student.rollNumber, a.student.user.fullName);
    if (a.status === 'PRESENT') row.present += 1;
    else if (a.status === 'ABSENT') row.absent += 1;
    else row.leave += 1;
  }
  for (const t of tests) {
    const row = ensure(t.studentId);
    row.testObtained += t.isAbsent ? 0 : t.obtainedMarks;
    row.testMax += t.test.maxMarks;
  }
  for (const s of assignments) {
    const row = ensure(s.studentId);
    row.assignmentTotal += 1;
    if (s.status === 'SUBMITTED' || s.status === 'LATE' || s.status === 'GRADED') row.submitted += 1;
  }

  const students = [...byStudent.entries()].map(([studentId, r]) => {
    const attPct = percentage(r.present, r.present + r.absent);
    return {
      studentId,
      rollNumber: r.rollNumber,
      name: r.name,
      attendancePercentage: attPct,
      attendanceStatus: attendanceHealth(attPct, settings.thresholds),
      testPercentage: percentage(r.testObtained, r.testMax),
      submissionRate: percentage(r.submitted, r.assignmentTotal),
    };
  });

  students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

  const classAttendance = tallyAttendance(attendance);
  const classTests = marksPercentage(
    tests.map((t) => ({ obtained: t.isAbsent ? 0 : t.obtainedMarks, max: t.test.maxMarks })),
  );

  return {
    subject: {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      faculty: subject.teacher?.user.fullName ?? 'Not assigned',
      semester: subject.semester.name,
      section: subject.section.name,
      department: subject.department.name,
    },
    classAttendance: classAttendance.percentage,
    classTestAverage: classTests.percentage,
    averageSubmissionRate: round1(
      students.reduce((a, s) => a + s.submissionRate, 0) / (students.length || 1),
    ),
    students,
  };
}
