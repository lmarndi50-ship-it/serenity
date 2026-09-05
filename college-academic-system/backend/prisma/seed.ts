/* eslint-disable no-console */
import bcrypt from 'bcryptjs';
import { AttendanceStatus, PrismaClient, Role, SubmissionStatus } from '@prisma/client';
import { toDateOnly } from '../src/utils/academics';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

/** Deterministic PRNG so re-seeding produces the same demo figures. */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}
const rand = makeRandom(20250420);

function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Fictional names — no real individuals.
const FIRST_NAMES = [
  'Rohan', 'Ananya', 'Aditya', 'Ishita', 'Sourav', 'Priyanka', 'Kunal', 'Sneha',
  'Debasish', 'Ritika', 'Manish', 'Swagatika', 'Abhijit', 'Nandini', 'Rajesh',
  'Pallavi', 'Subhankar', 'Arpita', 'Gautam', 'Madhusmita', 'Prateek', 'Sanjana',
  'Tapas', 'Lipsa', 'Bikash', 'Jyotsna', 'Harsh', 'Sumitra', 'Ashutosh', 'Rashmi',
];

const LAST_NAMES = [
  'Sharma', 'Mohanty', 'Patra', 'Das', 'Nayak', 'Behera', 'Sahoo', 'Mishra',
  'Panda', 'Rout', 'Jena', 'Swain', 'Pradhan', 'Barik', 'Dash',
];

async function main() {
  console.log('Clearing existing data…');
  // Order matters: children before parents.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.testMark.deleteMany();
  await prisma.test.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.section.deleteMany();
  await prisma.course.deleteMany();
  await prisma.department.deleteMany();
  await prisma.appSetting.deleteMany();

  console.log('Seeding settings…');
  await prisma.appSetting.create({
    data: {
      key: 'academic',
      value: {
        weights: { attendance: 0.3, tests: 0.4, assignments: 0.3 },
        thresholds: { good: 75, warning: 65 },
        collegeName: 'Bhubaneswar Institute of Technology',
      },
    },
  });

  console.log('Seeding departments and courses…');
  const cse = await prisma.department.create({
    data: { name: 'Computer Science & Engineering', code: 'CSE' },
  });
  const ece = await prisma.department.create({
    data: { name: 'Electronics & Communication Engineering', code: 'ECE' },
  });

  const btechCse = await prisma.course.create({
    data: { name: 'B.Tech Computer Science & Engineering', code: 'BTECH-CSE', departmentId: cse.id },
  });
  const btechEce = await prisma.course.create({
    data: { name: 'B.Tech Electronics & Communication', code: 'BTECH-ECE', departmentId: ece.id },
  });

  console.log('Seeding academic session, semesters and sections…');
  const session = await prisma.academicSession.create({
    data: {
      name: '2025-2026',
      startDate: new Date(Date.UTC(2025, 6, 1)),
      endDate: new Date(Date.UTC(2026, 5, 30)),
      isCurrent: true,
    },
  });

  // Semester 4 is "current"; semester 3 gives the analytics a second cohort.
  const sem3 = await prisma.semester.create({
    data: {
      number: 3,
      name: 'Semester 3',
      startDate: new Date(Date.UTC(2025, 6, 1)),
      endDate: new Date(Date.UTC(2025, 11, 15)),
      isCurrent: false,
      sessionId: session.id,
    },
  });
  const sem4 = await prisma.semester.create({
    data: {
      number: 4,
      name: 'Semester 4',
      startDate: new Date(Date.UTC(2026, 0, 5)),
      endDate: new Date(Date.UTC(2026, 5, 30)),
      isCurrent: true,
      sessionId: session.id,
    },
  });

  const sectionA = await prisma.section.create({ data: { name: 'A' } });
  const sectionB = await prisma.section.create({ data: { name: 'B' } });

  console.log('Seeding users…');
  const adminHash = await bcrypt.hash('Admin@123', BCRYPT_ROUNDS);
  const teacherHash = await bcrypt.hash('Teacher@123', BCRYPT_ROUNDS);
  const studentHash = await bcrypt.hash('Student@123', BCRYPT_ROUNDS);

  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      fullName: 'Dr. Meera Kanungo',
      phone: '+91 90000 10001',
    },
  });

  const teacherSpecs = [
    {
      email: 'teacher@demo.com',
      fullName: 'Dr. Ashok Sharma',
      employeeCode: 'FAC-CSE-01',
      designation: 'Professor',
      qualification: 'Ph.D. Computer Science',
      departmentId: cse.id,
    },
    {
      email: 'das.teacher@demo.com',
      fullName: 'Dr. Snehalata Das',
      employeeCode: 'FAC-ECE-02',
      designation: 'Associate Professor',
      qualification: 'Ph.D. Electronics',
      departmentId: ece.id,
    },
    {
      email: 'patra.teacher@demo.com',
      fullName: 'Dr. Ramesh Patra',
      employeeCode: 'FAC-CSE-03',
      designation: 'Assistant Professor',
      qualification: 'M.Tech, Ph.D. Mathematics',
      departmentId: cse.id,
    },
  ];

  const teachers = [];
  for (const [teacherIndex, spec] of teacherSpecs.entries()) {
    const teacher = await prisma.teacher.create({
      data: {
        employeeCode: spec.employeeCode,
        designation: spec.designation,
        qualification: spec.qualification,
        joiningYear: randomInt(2008, 2019),
        department: { connect: { id: spec.departmentId } },
        user: {
          create: {
            email: spec.email,
            passwordHash: teacherHash,
            role: Role.TEACHER,
            fullName: spec.fullName,
            phone: `+91 90000 2000${teacherIndex + 1}`,
          },
        },
      },
      include: { user: true },
    });
    teachers.push(teacher);
  }
  const [drSharma, drDas, drPatra] = teachers;

  console.log('Seeding subjects…');
  const subjectSpecs = [
    {
      name: 'Data Structures & Algorithms',
      code: 'CS201',
      credits: 4,
      teacherId: drSharma.id,
      departmentId: cse.id,
      courseId: btechCse.id,
      semesterId: sem4.id,
      sectionId: sectionA.id,
    },
    {
      name: 'Object Oriented Programming',
      code: 'CS202',
      credits: 4,
      teacherId: drSharma.id,
      departmentId: cse.id,
      courseId: btechCse.id,
      semesterId: sem4.id,
      sectionId: sectionA.id,
    },
    {
      name: 'Digital Electronics',
      code: 'EC203',
      credits: 3,
      teacherId: drDas.id,
      departmentId: cse.id,
      courseId: btechCse.id,
      semesterId: sem4.id,
      sectionId: sectionA.id,
    },
    {
      name: 'Engineering Mathematics III',
      code: 'MA204',
      credits: 4,
      teacherId: drPatra.id,
      departmentId: cse.id,
      courseId: btechCse.id,
      semesterId: sem4.id,
      sectionId: sectionA.id,
    },
    {
      name: 'Computer Networks',
      code: 'CS205',
      credits: 3,
      teacherId: drSharma.id,
      departmentId: cse.id,
      courseId: btechCse.id,
      semesterId: sem4.id,
      sectionId: sectionA.id,
    },
    {
      name: 'Database Management Systems',
      code: 'CS206',
      credits: 4,
      teacherId: drPatra.id,
      departmentId: cse.id,
      courseId: btechCse.id,
      semesterId: sem4.id,
      sectionId: sectionB.id,
    },
    {
      name: 'Signals & Systems',
      code: 'EC301',
      credits: 4,
      teacherId: drDas.id,
      departmentId: ece.id,
      courseId: btechEce.id,
      semesterId: sem3.id,
      sectionId: sectionB.id,
    },
  ];

  const subjects = [];
  for (const spec of subjectSpecs) {
    subjects.push(
      await prisma.subject.create({
        data: { ...spec, totalPlannedClasses: randomInt(40, 50) },
      }),
    );
  }

  console.log('Seeding students…');
  interface StudentSeed {
    id: string;
    userId: string;
    rollNumber: string;
    semesterId: string;
    sectionId: string;
  }
  const students: StudentSeed[] = [];

  // The demo student named in the README.
  const demoStudent = await prisma.student.create({
    data: {
      rollNumber: '23CS042',
      registrationNo: '2301289042',
      admissionYear: 2023,
      guardianName: 'Mr. Prabhat Sharma',
      address: 'Patia, Bhubaneswar, Odisha',
      dateOfBirth: new Date(Date.UTC(2005, 3, 18)),
      department: { connect: { id: cse.id } },
      course: { connect: { id: btechCse.id } },
      semester: { connect: { id: sem4.id } },
      section: { connect: { id: sectionA.id } },
      user: {
        create: {
          email: 'student@demo.com',
          passwordHash: studentHash,
          role: Role.STUDENT,
          fullName: 'Rohan Sharma',
          phone: '+91 90000 30001',
        },
      },
    },
  });
  students.push({
    id: demoStudent.id,
    userId: demoStudent.userId,
    rollNumber: demoStudent.rollNumber,
    semesterId: demoStudent.semesterId,
    sectionId: demoStudent.sectionId,
  });

  // 29 more, split across the two sections and two semesters.
  for (let i = 1; i <= 29; i += 1) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = pick(LAST_NAMES);
    const inSem4 = i <= 22;
    const section = inSem4 ? (i <= 17 ? sectionA : sectionB) : sectionB;
    const dept = inSem4 ? cse : ece;
    const course = inSem4 ? btechCse : btechEce;
    const rollPrefix = inSem4 ? '23CS' : '23EC';
    const rollNumber = `${rollPrefix}${String(i + 42).padStart(3, '0')}`;

    const created = await prisma.student.create({
      data: {
        rollNumber,
        registrationNo: `230128${String(9042 + i)}`,
        admissionYear: 2023,
        guardianName: `Mr. ${pick(LAST_NAMES)}`,
        department: { connect: { id: dept.id } },
        course: { connect: { id: course.id } },
        semester: { connect: { id: inSem4 ? sem4.id : sem3.id } },
        section: { connect: { id: section.id } },
        user: {
          create: {
            email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@student.demo.com`,
            passwordHash: studentHash,
            role: Role.STUDENT,
            fullName: `${first} ${last}`,
            phone: `+91 90000 3${String(i).padStart(4, '0')}`,
          },
        },
      },
    });

    students.push({
      id: created.id,
      userId: created.userId,
      rollNumber: created.rollNumber,
      semesterId: created.semesterId,
      sectionId: created.sectionId,
    });
  }

  console.log('Seeding enrollments…');
  const enrollmentData: { studentId: string; subjectId: string; semesterId: string }[] = [];
  for (const s of students) {
    for (const subject of subjects) {
      if (subject.semesterId === s.semesterId && subject.sectionId === s.sectionId) {
        enrollmentData.push({
          studentId: s.id,
          subjectId: subject.id,
          semesterId: subject.semesterId,
        });
      }
    }
  }
  await prisma.enrollment.createMany({ data: enrollmentData, skipDuplicates: true });

  console.log('Seeding attendance (8 weeks of classes)…');
  // Anchor the term on a Monday so the weekly trend buckets line up.
  const today = toDateOnly(new Date());
  const anchorMonday = addDays(today, -(((today.getUTCDay() + 6) % 7) + 7 * 7));

  // Overall diligence per student, used for marks and submissions as well.
  const studentBias = new Map<string, number>();
  students.forEach((s, index) => {
    if (s.rollNumber === '23CS042') studentBias.set(s.id, 0.88);
    else if (index % 9 === 0) studentBias.set(s.id, 0.62); // headed for Critical
    else if (index % 5 === 0) studentBias.set(s.id, 0.71); // headed for Warning
    else studentBias.set(s.id, 0.82 + rand() * 0.14);
  });

  // Per-subject difficulty, so at least one subject falls below the line.
  const subjectBias = new Map<string, number>(
    subjects.map((s) => {
      if (s.code === 'CS205') return [s.id, -0.2]; // Computer Networks: hardest
      if (s.code === 'MA204') return [s.id, -0.12]; // Mathematics: borderline
      if (s.code === 'CS201') return [s.id, 0.06];
      return [s.id, 0];
    }),
  );

  // The showcase student gets exact per-subject figures so the demo shows one
  // Good, one Warning and one Critical subject rather than whatever the RNG gives.
  const demoTargets: Record<string, number> = {
    CS201: 0.933,
    CS202: 0.9,
    EC203: 0.857,
    MA204: 0.72,
    CS205: 0.62,
  };

  const attendanceRows: {
    studentId: string;
    subjectId: string;
    teacherId: string | null;
    date: Date;
    period: number;
    status: AttendanceStatus;
  }[] = [];

  const enrollmentsBySubject = new Map<string, string[]>();
  for (const e of enrollmentData) {
    const list = enrollmentsBySubject.get(e.subjectId) ?? [];
    list.push(e.studentId);
    enrollmentsBySubject.set(e.subjectId, list);
  }

  for (const subject of subjects) {
    const roster = enrollmentsBySubject.get(subject.id) ?? [];
    if (roster.length === 0) continue;
    const bias = subjectBias.get(subject.id) ?? 0;

    // Build the class calendar first: roughly 4 classes a week for 8 weeks.
    const classSlots: { date: Date; period: number }[] = [];
    for (let week = 0; week < 8; week += 1) {
      const classDays = [0, 2, 3, 4].slice(0, randomInt(3, 4));
      for (const dayOffset of classDays) {
        const date = addDays(anchorMonday, week * 7 + dayOffset);
        if (date > today) continue;
        classSlots.push({ date, period: randomInt(1, 4) });
      }
    }
    if (classSlots.length === 0) continue;

    // Absences are placed on a fixed stride rather than sampled, so each
    // student's final percentage is exactly the intended target.
    for (const studentId of roster) {
      const isDemo = studentId === demoStudent.id;
      const target = isDemo
        ? (demoTargets[subject.code] ?? 0.88)
        : Math.max(0.45, Math.min(0.97, (studentBias.get(studentId) ?? 0.8) + bias));

      const total = classSlots.length;
      // LEAVE is excluded from the percentage, so it is taken off the top and
      // the target is applied to the remaining "counted" classes.
      const leaves = total >= 20 ? 1 : 0;
      const considered = total - leaves;
      const absences = Math.round(considered * (1 - target));
      const stride = absences > 0 ? considered / absences : considered + 1;

      const absentIndices = new Set<number>();
      for (let k = 0; k < absences; k += 1) {
        absentIndices.add(Math.min(considered - 1, Math.floor(k * stride + stride / 2)));
      }
      // Rounding collisions would silently raise the percentage; fill the gaps.
      let probe = 0;
      while (absentIndices.size < absences && probe < considered) {
        absentIndices.add(probe);
        probe += 1;
      }

      // The leave slot sits at the end so it never shifts the absence pattern.
      classSlots.forEach((slot, index) => {
        const status =
          index >= considered
            ? AttendanceStatus.LEAVE
            : absentIndices.has(index)
              ? AttendanceStatus.ABSENT
              : AttendanceStatus.PRESENT;
        attendanceRows.push({
          studentId,
          subjectId: subject.id,
          teacherId: subject.teacherId,
          date: slot.date,
          period: slot.period,
          status,
        });
      });
    }
  }

  // De-duplicate on the unique key before inserting.
  const seen = new Set<string>();
  const uniqueAttendance = attendanceRows.filter((r) => {
    const key = `${r.studentId}|${r.subjectId}|${r.date.toISOString()}|${r.period}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (let i = 0; i < uniqueAttendance.length; i += 2000) {
    await prisma.attendance.createMany({
      data: uniqueAttendance.slice(i, i + 2000),
      skipDuplicates: true,
    });
  }
  console.log(`  ${uniqueAttendance.length} attendance records`);

  console.log('Seeding tests and marks…');
  const testMarkRows: {
    testId: string;
    studentId: string;
    obtainedMarks: number;
    isAbsent: boolean;
  }[] = [];

  for (const subject of subjects) {
    const roster = enrollmentsBySubject.get(subject.id) ?? [];
    if (roster.length === 0) continue;

    for (let n = 1; n <= 2; n += 1) {
      const testDate = addDays(anchorMonday, n * 21 + randomInt(0, 4));
      const isPast = testDate <= today;
      const test = await prisma.test.create({
        data: {
          subjectId: subject.id,
          teacherId: subject.teacherId,
          name: `Class Test ${n}`,
          description: `Internal assessment ${n} for ${subject.name}.`,
          testDate,
          maxMarks: 50,
          isPublished: isPast,
        },
      });

      await prisma.calendarEvent.create({
        data: {
          title: `${subject.name} — Class Test ${n}`,
          description: `Internal assessment ${n}`,
          type: 'TEST',
          startAt: testDate,
          subjectId: subject.id,
          testId: test.id,
        },
      });

      if (!isPast) continue;

      for (const studentId of roster) {
        const ability = (studentBias.get(studentId) ?? 0.8) - 0.05;
        const absent = rand() < 0.03;
        const raw = absent ? 0 : Math.round(50 * (ability * 0.85 + rand() * 0.25));
        testMarkRows.push({
          testId: test.id,
          studentId,
          obtainedMarks: absent ? 0 : Math.max(8, Math.min(50, raw)),
          isAbsent: absent,
        });
      }
    }
  }
  await prisma.testMark.createMany({ data: testMarkRows, skipDuplicates: true });
  console.log(`  ${testMarkRows.length} test marks`);

  console.log('Seeding assignments and submissions…');
  const assignmentTitles: Record<string, string[]> = {
    CS201: ['Linked List Implementation', 'Graph Traversal Report'],
    CS202: ['OOP Concepts in Java', 'Design Patterns Case Study'],
    EC203: ['Combinational Circuit Design', 'Flip-Flop Timing Analysis'],
    MA204: ['Relations and Functions', 'Laplace Transform Problem Set'],
    CS205: ['OSI Model Report', 'Subnetting Exercise'],
    CS206: ['ER Diagram for a Library', 'Normalisation Worksheet'],
    EC301: ['Fourier Series Assignment', 'Convolution Problem Set'],
  };

  const submissionRows: {
    assignmentId: string;
    studentId: string;
    status: SubmissionStatus;
    submittedAt: Date | null;
    obtainedMarks: number | null;
    feedback: string | null;
    gradedAt: Date | null;
  }[] = [];

  for (const subject of subjects) {
    const roster = enrollmentsBySubject.get(subject.id) ?? [];
    if (roster.length === 0) continue;
    const titles = assignmentTitles[subject.code] ?? ['Assignment 1', 'Assignment 2'];

    for (let n = 0; n < titles.length; n += 1) {
      // Every subject's first assignment is already due. The second is due
      // only for the earlier subjects, so the demo shows both a realistic
      // submission rate and some deadlines still ahead.
      const secondIsPast = subjects.indexOf(subject) < subjects.length - 4;
      const dueDate = addDays(
        anchorMonday,
        n === 0 ? 24 : secondIsPast ? 45 : 60 + randomInt(0, 6),
      );
      dueDate.setUTCHours(23, 59, 0, 0);
      const isPast = dueDate <= new Date();

      const assignment = await prisma.assignment.create({
        data: {
          subjectId: subject.id,
          teacherId: subject.teacherId,
          title: titles[n],
          description: `Submit a typed report for "${titles[n]}". Late submissions are recorded.`,
          dueDate,
          maxMarks: 20,
        },
      });

      await prisma.calendarEvent.create({
        data: {
          title: `${subject.name} — ${titles[n]}`,
          description: 'Assignment deadline',
          type: 'ASSIGNMENT',
          startAt: dueDate,
          subjectId: subject.id,
          assignmentId: assignment.id,
        },
      });

      for (const studentId of roster) {
        const diligence = studentBias.get(studentId) ?? 0.8;

        if (!isPast) {
          submissionRows.push({
            assignmentId: assignment.id,
            studentId,
            status: SubmissionStatus.PENDING,
            submittedAt: null,
            obtainedMarks: null,
            feedback: null,
            gradedAt: null,
          });
          continue;
        }

        const roll = rand();
        if (roll > diligence + 0.12) {
          submissionRows.push({
            assignmentId: assignment.id,
            studentId,
            status: SubmissionStatus.NOT_SUBMITTED,
            submittedAt: null,
            obtainedMarks: null,
            feedback: null,
            gradedAt: null,
          });
          continue;
        }

        const late = rand() < 0.12;
        const submittedAt = addDays(dueDate, late ? randomInt(1, 3) : -randomInt(0, 4));
        const graded = rand() < 0.8;
        const marks = Math.max(8, Math.min(20, Math.round(20 * (diligence * 0.9 + rand() * 0.2))));

        submissionRows.push({
          assignmentId: assignment.id,
          studentId,
          status: graded
            ? SubmissionStatus.GRADED
            : late
              ? SubmissionStatus.LATE
              : SubmissionStatus.SUBMITTED,
          submittedAt,
          obtainedMarks: graded ? marks : null,
          feedback: graded
            ? pick([
                'Well structured. Add more worked examples next time.',
                'Correct approach; presentation could be neater.',
                'Good depth of analysis.',
                'Covers the basics — expand the conclusion.',
              ])
            : null,
          gradedAt: graded ? addDays(submittedAt, 3) : null,
        });
      }
    }
  }
  await prisma.assignmentSubmission.createMany({ data: submissionRows, skipDuplicates: true });
  console.log(`  ${submissionRows.length} assignment submissions`);

  console.log('Seeding notices and college events…');
  const admin = await prisma.user.findFirstOrThrow({ where: { role: Role.ADMIN } });

  const notices = [
    {
      title: 'Mid-semester examination schedule published',
      body: 'The mid-semester examination timetable for Semester 4 has been published on the department notice board. Students must carry their identity cards.',
    },
    {
      title: 'Attendance shortfall review',
      body: 'Students with attendance below 75% in any subject must meet their faculty advisor before the end of this month.',
    },
    {
      title: 'Technical fest — registrations open',
      body: 'Registrations for the annual inter-college technical fest are open. Teams of up to four members may register with the student council.',
    },
  ];

  for (const n of notices) {
    const notice = await prisma.notice.create({
      data: { ...n, audience: 'ALL', authorId: admin.id },
    });
    await prisma.calendarEvent.create({
      data: {
        title: notice.title,
        description: notice.body.slice(0, 200),
        type: 'NOTICE',
        startAt: notice.publishedAt,
        noticeId: notice.id,
        createdById: admin.id,
      },
    });
  }

  await prisma.calendarEvent.createMany({
    data: [
      {
        title: 'Mid-Semester Examination begins',
        description: 'Semester 4 mid-semester examinations across all departments.',
        type: 'EXAM',
        startAt: addDays(today, 21),
        location: 'Examination Hall, Block C',
        createdById: admin.id,
      },
      {
        title: 'Annual Technical Fest',
        description: 'Two-day inter-college technical festival.',
        type: 'EVENT',
        startAt: addDays(today, 34),
        endAt: addDays(today, 35),
        location: 'Main Auditorium',
        createdById: admin.id,
      },
      {
        title: 'Institute Foundation Day (holiday)',
        type: 'HOLIDAY',
        startAt: addDays(today, 12),
        createdById: admin.id,
      },
    ],
  });

  console.log('Generating attendance warning notifications…');
  // Uses the same rule the API applies at runtime.
  const allAttendance = await prisma.attendance.findMany({
    select: { studentId: true, subjectId: true, status: true },
  });
  const tallies = new Map<string, { present: number; absent: number }>();
  for (const a of allAttendance) {
    const key = `${a.studentId}|${a.subjectId}`;
    const t = tallies.get(key) ?? { present: 0, absent: 0 };
    if (a.status === 'PRESENT') t.present += 1;
    else if (a.status === 'ABSENT') t.absent += 1;
    tallies.set(key, t);
  }

  const studentUserById = new Map(students.map((s) => [s.id, s.userId]));
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
  const warningRows: {
    userId: string;
    type: 'ATTENDANCE';
    title: string;
    message: string;
    link: string;
    dedupeKey: string;
    isRead: boolean;
  }[] = [];

  for (const [key, t] of tallies) {
    const considered = t.present + t.absent;
    if (considered === 0) continue;
    const pct = Math.round((t.present / considered) * 1000) / 10;
    if (pct >= 75) continue;

    const [studentId, subjectId] = key.split('|');
    const userId = studentUserById.get(studentId);
    if (!userId) continue;
    const health = pct >= 65 ? 'WARNING' : 'CRITICAL';

    warningRows.push({
      userId,
      type: 'ATTENDANCE',
      title: health === 'CRITICAL' ? 'Attendance critically low' : 'Attendance below requirement',
      message: `Your attendance in ${subjectNameById.get(subjectId)} is ${pct}%. ${
        health === 'CRITICAL'
          ? 'You are at risk of being detained. Please meet your faculty advisor.'
          : 'Please improve your attendance to stay above the required minimum.'
      }`,
      link: '/attendance',
      dedupeKey: `attendance:${subjectId}:${health}`,
      isRead: false,
    });
  }
  await prisma.notification.createMany({ data: warningRows, skipDuplicates: true });

  console.log('Seeding general notifications…');
  const generalRows = [];
  for (const s of students) {
    generalRows.push(
      {
        userId: s.userId,
        type: 'NOTICE' as const,
        title: 'New notice from the department',
        message: 'Mid-semester examination schedule published.',
        link: '/notices',
        isRead: false,
      },
      {
        userId: s.userId,
        type: 'TEST' as const,
        title: 'Test marks published',
        message: 'Digital Electronics — Class Test 1 marks have been published.',
        link: '/tests',
        isRead: rand() > 0.5,
      },
    );
  }
  await prisma.notification.createMany({ data: generalRows });

  const counts = {
    users: await prisma.user.count(),
    students: await prisma.student.count(),
    teachers: await prisma.teacher.count(),
    subjects: await prisma.subject.count(),
    attendance: await prisma.attendance.count(),
    tests: await prisma.test.count(),
    testMarks: await prisma.testMark.count(),
    assignments: await prisma.assignment.count(),
    submissions: await prisma.assignmentSubmission.count(),
    notifications: await prisma.notification.count(),
    events: await prisma.calendarEvent.count(),
  };

  console.log('\nSeed complete:', counts);
  console.log('\nDemo logins (development only):');
  console.log('  Student : student@demo.com / Student@123   (Rohan Sharma, 23CS042)');
  console.log('  Teacher : teacher@demo.com / Teacher@123   (Dr. Ashok Sharma)');
  console.log('  Admin   : admin@demo.com   / Admin@123     (Dr. Meera Kanungo)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
