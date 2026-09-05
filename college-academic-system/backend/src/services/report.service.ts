import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/apiError';
import { getSettings } from './settings.service';
import { getStudentSummary, getSubjectAttendance, getSubjectPerformance } from './analytics.service';
import { percentage } from '../utils/academics';

export interface ReportTable {
  title: string;
  subtitle: string[];
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number>[];
  footer?: string[];
}

// ---------------------------------------------------------------------------
// Report builders — each returns a printable table description
// ---------------------------------------------------------------------------

export async function buildStudentAttendanceReport(studentId: string): Promise<ReportTable> {
  const [student, rows, summary, settings] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { fullName: true, email: true } },
        department: true,
        course: true,
        semester: { include: { session: true } },
        section: true,
      },
    }),
    getSubjectAttendance(studentId),
    getStudentSummary(studentId),
    getSettings(),
  ]);

  if (!student) throw ApiError.notFound('Student not found.');

  return {
    title: 'Attendance Report',
    subtitle: [
      settings.collegeName,
      `${student.user.fullName}  •  Roll No: ${student.rollNumber}  •  Reg. No: ${student.registrationNo}`,
      `${student.course.name} (${student.department.code})  •  ${student.semester.name}  •  Section ${student.section.name}`,
      `Academic year: ${student.semester.session.name}`,
    ],
    columns: [
      { header: 'Subject', key: 'subject', width: 30 },
      { header: 'Code', key: 'code', width: 12 },
      { header: 'Faculty', key: 'faculty', width: 22 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Present', key: 'present', width: 10 },
      { header: 'Absent', key: 'absent', width: 10 },
      { header: 'Leave', key: 'leave', width: 10 },
      { header: 'Attendance %', key: 'percentage', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
    ],
    rows: rows.map((r) => ({
      subject: r.subjectName,
      code: r.subjectCode,
      faculty: r.facultyName,
      total: r.total,
      present: r.present,
      absent: r.absent,
      leave: r.leave,
      percentage: `${r.percentage}%`,
      status: r.status,
    })),
    footer: [
      `Overall attendance: ${summary.attendance.percentage}%  (${summary.attendance.present} present of ${summary.attendance.considered} counted classes)`,
      `Minimum required: ${settings.thresholds.good}%`,
    ],
  };
}

export async function buildStudentMarksReport(studentId: string): Promise<ReportTable> {
  const [student, marks, summary, settings] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { fullName: true } },
        department: true,
        semester: { include: { session: true } },
        section: true,
      },
    }),
    prisma.testMark.findMany({
      where: { studentId, test: { isPublished: true } },
      include: { test: { include: { subject: { select: { name: true, code: true } } } } },
      orderBy: { test: { testDate: 'asc' } },
    }),
    getStudentSummary(studentId),
    getSettings(),
  ]);

  if (!student) throw ApiError.notFound('Student not found.');

  return {
    title: 'Class Test Marks Report',
    subtitle: [
      settings.collegeName,
      `${student.user.fullName}  •  Roll No: ${student.rollNumber}`,
      `${student.department.name}  •  ${student.semester.name}  •  Section ${student.section.name}`,
      `Academic year: ${student.semester.session.name}`,
    ],
    columns: [
      { header: 'Subject', key: 'subject', width: 30 },
      { header: 'Test', key: 'test', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Marks', key: 'obtained', width: 10 },
      { header: 'Out of', key: 'max', width: 10 },
      { header: 'Percentage', key: 'percentage', width: 14 },
    ],
    rows: marks.map((m) => ({
      subject: m.test.subject.name,
      test: m.test.name,
      date: m.test.testDate.toISOString().slice(0, 10),
      obtained: m.isAbsent ? 'AB' : m.obtainedMarks,
      max: m.test.maxMarks,
      percentage: m.isAbsent ? '—' : `${percentage(m.obtainedMarks, m.test.maxMarks)}%`,
    })),
    footer: [`Test average: ${summary.tests.percentage}% (${summary.tests.obtained}/${summary.tests.max})`],
  };
}

export async function buildStudentAssignmentReport(studentId: string): Promise<ReportTable> {
  const [student, submissions, summary, settings] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { fullName: true } },
        department: true,
        semester: { include: { session: true } },
      },
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: {
        assignment: { include: { subject: { select: { name: true } } } },
      },
      orderBy: { assignment: { dueDate: 'asc' } },
    }),
    getStudentSummary(studentId),
    getSettings(),
  ]);

  if (!student) throw ApiError.notFound('Student not found.');

  return {
    title: 'Assignment Report',
    subtitle: [
      settings.collegeName,
      `${student.user.fullName}  •  Roll No: ${student.rollNumber}`,
      `${student.department.name}  •  ${student.semester.name}`,
      `Academic year: ${student.semester.session.name}`,
    ],
    columns: [
      { header: 'Subject', key: 'subject', width: 26 },
      { header: 'Assignment', key: 'title', width: 32 },
      { header: 'Due date', key: 'due', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Marks', key: 'obtained', width: 10 },
      { header: 'Out of', key: 'max', width: 10 },
    ],
    rows: submissions.map((s) => ({
      subject: s.assignment.subject.name,
      title: s.assignment.title,
      due: s.assignment.dueDate.toISOString().slice(0, 10),
      status: s.status.replace('_', ' '),
      obtained: s.obtainedMarks ?? '—',
      max: s.assignment.maxMarks,
    })),
    footer: [
      `Submitted: ${summary.assignments.submitted} of ${summary.assignments.total} (${summary.assignments.submissionRate}%)`,
    ],
  };
}

export async function buildStudentPerformanceReport(studentId: string): Promise<ReportTable> {
  const [student, summary, subjects, settings] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { fullName: true } },
        department: true,
        semester: { include: { session: true } },
      },
    }),
    getStudentSummary(studentId),
    getSubjectAttendance(studentId),
    getSettings(),
  ]);

  if (!student) throw ApiError.notFound('Student not found.');

  const w = summary.weights;

  return {
    title: 'Overall Performance Report',
    subtitle: [
      settings.collegeName,
      `${student.user.fullName}  •  Roll No: ${student.rollNumber}`,
      `${student.department.name}  •  ${student.semester.name}`,
      `Academic year: ${student.semester.session.name}`,
    ],
    columns: [
      { header: 'Component', key: 'component', width: 28 },
      { header: 'Score', key: 'score', width: 14 },
      { header: 'Weight', key: 'weight', width: 12 },
      { header: 'Weighted', key: 'weighted', width: 14 },
    ],
    rows: [
      {
        component: 'Attendance',
        score: `${summary.attendance.percentage}%`,
        weight: `${Math.round(w.attendance * 100)}%`,
        weighted: `${Math.round(summary.attendance.percentage * w.attendance * 10) / 10}`,
      },
      {
        component: 'Class tests',
        score: `${summary.tests.percentage}%`,
        weight: `${Math.round(w.tests * 100)}%`,
        weighted: `${Math.round(summary.tests.percentage * w.tests * 10) / 10}`,
      },
      {
        component: 'Assignments',
        score: `${summary.assignments.marksPercentage || summary.assignments.submissionRate}%`,
        weight: `${Math.round(w.assignments * 100)}%`,
        weighted: `${
          Math.round(
            (summary.assignments.marksPercentage || summary.assignments.submissionRate) *
              w.assignments *
              10,
          ) / 10
        }`,
      },
      ...subjects.map((s) => ({
        component: `  ${s.subjectName} attendance`,
        score: `${s.percentage}%`,
        weight: '—',
        weighted: s.status,
      })),
    ],
    footer: [`Overall score: ${summary.overall}%`],
  };
}

export async function buildSubjectReport(subjectId: string): Promise<ReportTable> {
  const [data, settings] = await Promise.all([getSubjectPerformance(subjectId), getSettings()]);
  if (!data) throw ApiError.notFound('Subject not found.');

  return {
    title: `Class Report — ${data.subject.name}`,
    subtitle: [
      settings.collegeName,
      `${data.subject.name} (${data.subject.code})  •  Faculty: ${data.subject.faculty}`,
      `${data.subject.department}  •  ${data.subject.semester}  •  Section ${data.subject.section}`,
    ],
    columns: [
      { header: 'Roll No', key: 'roll', width: 14 },
      { header: 'Student', key: 'name', width: 30 },
      { header: 'Attendance %', key: 'attendance', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Test %', key: 'tests', width: 12 },
      { header: 'Submission %', key: 'submissions', width: 14 },
    ],
    rows: data.students.map((s) => ({
      roll: s.rollNumber,
      name: s.name,
      attendance: `${s.attendancePercentage}%`,
      status: s.attendanceStatus,
      tests: `${s.testPercentage}%`,
      submissions: `${s.submissionRate}%`,
    })),
    footer: [
      `Class attendance: ${data.classAttendance}%  •  Class test average: ${data.classTestAverage}%  •  Average submission rate: ${data.averageSubmissionRate}%`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

export function streamPdf(res: Response, table: ReportTable, filename: string): void {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).fillColor('#0f172a').text(table.title, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#475569');
  for (const line of table.subtitle) doc.text(line);
  doc.moveDown(0.6);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const totalWidth = table.columns.reduce((a, c) => a + (c.width ?? 16), 0);
  const widths = table.columns.map((c) => ((c.width ?? 16) / totalWidth) * pageWidth);

  const drawRow = (values: (string | number)[], bold: boolean, y: number) => {
    let x = doc.page.margins.left;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
    values.forEach((value, i) => {
      doc.text(String(value), x + 3, y + 5, { width: widths[i] - 6, ellipsis: true });
      x += widths[i];
    });
  };

  const rowHeight = 18;
  let y = doc.y;

  doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#1e293b');
  doc.fillColor('#ffffff');
  drawRow(
    table.columns.map((c) => c.header),
    true,
    y,
  );
  y += rowHeight;

  table.rows.forEach((row, index) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      y = doc.page.margins.top;
      doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#1e293b');
      doc.fillColor('#ffffff');
      drawRow(
        table.columns.map((c) => c.header),
        true,
        y,
      );
      y += rowHeight;
    }
    if (index % 2 === 1) {
      doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#f1f5f9');
    }
    doc.fillColor('#0f172a');
    drawRow(
      table.columns.map((c) => row[c.key] ?? ''),
      false,
      y,
    );
    y += rowHeight;
  });

  if (table.footer?.length) {
    y += 10;
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
    for (const line of table.footer) {
      doc.text(line, doc.page.margins.left, y);
      y += 14;
    }
  }

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#94a3b8')
    .text(
      `Generated on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by CAMS`,
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 12,
    );

  doc.end();
}

export async function streamExcel(
  res: Response,
  table: ReportTable,
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CAMS';
  const sheet = workbook.addWorksheet(table.title.slice(0, 30));

  sheet.mergeCells(1, 1, 1, table.columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = table.title;
  titleCell.font = { size: 15, bold: true, color: { argb: 'FF0F172A' } };

  let row = 2;
  for (const line of table.subtitle) {
    sheet.mergeCells(row, 1, row, table.columns.length);
    const cell = sheet.getCell(row, 1);
    cell.value = line;
    cell.font = { size: 9, color: { argb: 'FF475569' } };
    row += 1;
  }
  row += 1;

  const headerRow = sheet.getRow(row);
  table.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    sheet.getColumn(i + 1).width = col.width ?? 18;
  });
  headerRow.commit();
  row += 1;

  for (const dataRow of table.rows) {
    const r = sheet.getRow(row);
    table.columns.forEach((col, i) => {
      r.getCell(i + 1).value = dataRow[col.key] ?? '';
    });
    r.commit();
    row += 1;
  }

  if (table.footer?.length) {
    row += 1;
    for (const line of table.footer) {
      sheet.mergeCells(row, 1, row, table.columns.length);
      const cell = sheet.getCell(row, 1);
      cell.value = line;
      cell.font = { bold: true };
      row += 1;
    }
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}
