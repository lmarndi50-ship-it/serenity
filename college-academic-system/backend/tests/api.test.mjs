/**
 * API integration checks against a running server.
 *
 *   1. npm run seed     (the assertions expect the seeded demo data)
 *   2. npm run dev      (or npm start)
 *   3. npm run test:api
 *
 * No test framework and no dependencies — plain Node with global fetch.
 * These checks MUTATE the database: re-seed afterwards for a clean demo.
 */
const BASE = process.env.API_URL ?? 'http://localhost:4000/api';
let fails = 0;

async function login(identifier, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`login failed: ${j.message}`);
  return j.data;
}

async function api(token, path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
  });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
  return { status: r.status, body };
}

function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) fails += 1;
}

const teacher = await login('teacher@demo.com', 'Teacher@123');
const student = await login('student@demo.com', 'Student@123');
const admin = await login('admin@demo.com', 'Admin@123');
const T = teacher.accessToken, S = student.accessToken, A = admin.accessToken;

// --- teacher subjects ---
const subjects = await api(T, '/teacher/subjects');
check('teacher sees only own subjects', subjects.body.data.length === 3,
  `${subjects.body.data.length} subjects`);
const subject = subjects.body.data.find((s) => s.code === 'CS201');

// --- attendance sheet + marking ---
const today = new Date().toISOString().slice(0, 10);
const sheet = await api(T, `/teacher/attendance/sheet?subjectId=${subject.id}&date=${today}&period=6`);
check('attendance sheet loads roster', sheet.body.data.students.length > 0,
  `${sheet.body.data.students.length} students`);

const entries = sheet.body.data.students.map((s, i) => ({
  studentId: s.studentId,
  status: i === 0 ? 'ABSENT' : 'PRESENT',
}));
const save1 = await api(T, '/teacher/attendance', {
  method: 'POST',
  body: JSON.stringify({ subjectId: subject.id, date: today, period: 6, entries }),
});
check('attendance saves', save1.status === 201, `status ${save1.status}`);

const save2 = await api(T, '/teacher/attendance', {
  method: 'POST',
  body: JSON.stringify({ subjectId: subject.id, date: today, period: 6, entries }),
});
check('re-saving same sheet is idempotent, not duplicated', save2.status === 201);

const after = await api(T, `/teacher/attendance/sheet?subjectId=${subject.id}&date=${today}&period=6`);
const marked = after.body.data.students.filter((s) => s.status !== null).length;
check('no duplicate rows after double save', marked === entries.length,
  `${marked} marked of ${entries.length}`);

const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const futureSave = await api(T, '/teacher/attendance', {
  method: 'POST',
  body: JSON.stringify({ subjectId: subject.id, date: future, period: 1, entries }),
});
check('future-dated attendance rejected', futureSave.status === 400, futureSave.body.message);

// --- teacher may not touch another teacher's subject ---
const adminSubjects = await api(A, '/admin/subjects?page=1&pageSize=50');
const foreign = adminSubjects.body.data.find((s) => s.code === 'EC301');
const foreignSave = await api(T, '/teacher/attendance', {
  method: 'POST',
  body: JSON.stringify({ subjectId: foreign.id, date: today, period: 1, entries }),
});
check('teacher blocked from unassigned subject', foreignSave.status === 403, foreignSave.body.message);

// --- test creation + marks ---
const created = await api(T, '/teacher/tests', {
  method: 'POST',
  body: JSON.stringify({
    subjectId: subject.id, name: 'Integration Test 3',
    testDate: today, maxMarks: 40, description: 'created by integration check',
  }),
});
check('test created', created.status === 201, `status ${created.status}`);
const testId = created.body.data.id;

const markSheet = await api(T, `/teacher/tests/${testId}/marks`);
const roster = markSheet.body.data.students;

const overMax = await api(T, `/teacher/tests/${testId}/marks`, {
  method: 'POST',
  body: JSON.stringify({ marks: [{ studentId: roster[0].studentId, obtainedMarks: 45 }] }),
});
check('marks above maximum rejected', overMax.status === 400, overMax.body.message);

const negative = await api(T, `/teacher/tests/${testId}/marks`, {
  method: 'POST',
  body: JSON.stringify({ marks: [{ studentId: roster[0].studentId, obtainedMarks: -5 }] }),
});
check('negative marks rejected', negative.status === 422, negative.body.message);

const goodMarks = await api(T, `/teacher/tests/${testId}/marks`, {
  method: 'POST',
  body: JSON.stringify({
    marks: roster.map((r, i) => ({ studentId: r.studentId, obtainedMarks: 30 + (i % 10) })),
    publish: true,
  }),
});
check('valid marks saved and published', goodMarks.status === 200, JSON.stringify(goodMarks.body.data));

// --- student sees the published test, and cannot write ---
const studentTests = await api(S, '/students/me/tests');
const found = studentTests.body.data.marks.find((m) => m.testName === 'Integration Test 3');
check('student sees published marks', !!found, found ? `${found.obtainedMarks}/${found.maxMarks} = ${found.percentage}%` : 'not found');
check('percentage computed server-side', found && found.percentage === Math.round((found.obtainedMarks / found.maxMarks) * 1000) / 10);

const studentWrite = await api(S, '/teacher/attendance', {
  method: 'POST',
  body: JSON.stringify({ subjectId: subject.id, date: today, period: 7, entries }),
});
check('student cannot mark attendance', studentWrite.status === 403);

// --- assignment lifecycle ---
const dueDate = new Date(Date.now() + 3 * 86400000).toISOString();
const assignment = await api(T, '/teacher/assignments', {
  method: 'POST',
  body: JSON.stringify({
    subjectId: subject.id, title: 'Integration Assignment',
    description: 'check', dueDate, maxMarks: 25,
  }),
});
check('assignment created', assignment.status === 201, `status ${assignment.status}`);

const subs = await api(T, `/teacher/assignments/${assignment.body.data.id}/submissions`);
check('submission rows pre-created for whole class', subs.body.data.submissions.length === roster.length,
  `${subs.body.data.submissions.length} rows`);

const mine = subs.body.data.submissions.find((s) => s.rollNumber === '23CS042');
const submit = await api(S, `/students/me/assignments/${assignment.body.data.id}/submit`, {
  method: 'POST',
  body: JSON.stringify({ contentText: 'My submitted answer.' }),
});
check('student submits before due date -> SUBMITTED', submit.body.data?.status === 'SUBMITTED',
  submit.body.data?.status ?? JSON.stringify(submit.body));

const grade = await api(T, `/teacher/submissions/${mine.id}/grade`, {
  method: 'POST',
  body: JSON.stringify({ obtainedMarks: 22, feedback: 'Good work.' }),
});
check('teacher grades submission', grade.body.data?.status === 'GRADED');

const overGrade = await api(T, `/teacher/submissions/${mine.id}/grade`, {
  method: 'POST',
  body: JSON.stringify({ obtainedMarks: 99 }),
});
check('grade above maximum rejected', overGrade.status === 400, overGrade.body.message);

// --- notifications ---
const notif = await api(S, '/notifications');
check('student has notifications', notif.body.data.notifications.length > 0,
  `${notif.body.data.notifications.length} (${notif.body.data.unread} unread)`);
const warning = notif.body.data.notifications.find((n) => n.type === 'ATTENDANCE');
check('automatic attendance warning exists', !!warning, warning?.message?.slice(0, 70));
const readAll = await api(S, '/notifications/read-all', { method: 'PATCH' });
check('mark all as read', readAll.body.data.updated >= 1, `${readAll.body.data.updated} updated`);

// --- admin analytics ---
const an = await api(A, '/admin/analytics');
const k = an.body.data.kpis;
check('admin KPIs computed', k.totalStudents === 30 && k.totalTeachers === 3,
  `${k.totalStudents} students, ${k.totalTeachers} teachers, avg attendance ${k.averageAttendance}%`);
check('department chart has data', an.body.data.departmentAttendance.length === 2);
check('test distribution has data', an.body.data.testDistribution.some((b) => b.count > 0));

// --- configurable weights ---
const origSettings = (await api(A, '/admin/settings')).body.data;
const before = (await api(S, '/students/me/dashboard')).body.data.summary.overall;
await api(A, '/admin/settings', {
  method: 'PUT',
  body: JSON.stringify({ ...origSettings, weights: { attendance: 0.6, tests: 0.2, assignments: 0.2 } }),
});
const after2 = (await api(S, '/students/me/dashboard')).body.data.summary.overall;
check('overall score responds to admin weights', before !== after2, `${before}% -> ${after2}%`);
await api(A, '/admin/settings', { method: 'PUT', body: JSON.stringify(origSettings) });

// --- reports ---
for (const [kind, fmt, type] of [
  ['attendance', 'pdf', 'application/pdf'],
  ['marks', 'excel', 'spreadsheet'],
  ['performance', 'pdf', 'application/pdf'],
]) {
  const r = await fetch(`${BASE}/reports/${kind}?format=${fmt}`, {
    headers: { Authorization: `Bearer ${S}` },
  });
  const buf = Buffer.from(await r.arrayBuffer());
  check(`report ${kind}.${fmt}`, r.status === 200 && buf.length > 500 && (r.headers.get('content-type') || '').includes(type),
    `${buf.length} bytes, ${r.headers.get('content-type')}`);
}

const foreignReport = await fetch(`${BASE}/reports/attendance?format=pdf&studentId=${crypto.randomUUID()}`, {
  headers: { Authorization: `Bearer ${S}` },
});
check('student cannot export another student', foreignReport.status === 403);

// --- token refresh ---
const rr = await fetch(`${BASE}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: student.refreshToken }),
});
const rj = await rr.json();
check('refresh token rotates', rj.success && rj.data.refreshToken !== student.refreshToken);
const reuse = await fetch(`${BASE}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: student.refreshToken }),
});
check('used refresh token rejected', reuse.status === 401);

// --- calendar ---
const cal = await api(S, '/calendar');
check('calendar returns events', cal.body.data.length > 0, `${cal.body.data.length} events`);

console.log(`\n${fails === 0 ? 'ALL PASSED' : fails + ' FAILURES'}`);
process.exit(fails === 0 ? 0 : 1);
