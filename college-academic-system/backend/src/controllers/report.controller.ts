import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { requireUser } from '../middleware/auth';
import {
  buildStudentAssignmentReport,
  buildStudentAttendanceReport,
  buildStudentMarksReport,
  buildStudentPerformanceReport,
  buildSubjectReport,
  streamExcel,
  streamPdf,
  type ReportTable,
} from '../services/report.service';
import { assertSubjectAccess } from './teacher.controller';

type ReportKind = 'attendance' | 'marks' | 'assignments' | 'performance' | 'subject';

/**
 * Resolves which student a report is for.
 * Students may only ever export their own record; staff may name a student.
 */
function resolveStudentId(req: Request): string {
  const user = requireUser(req);
  const requested = (req.query as { studentId?: string }).studentId;

  if (user.role === Role.STUDENT) {
    if (!user.studentId) throw ApiError.forbidden('No student profile is linked to this account.');
    if (requested && requested !== user.studentId) {
      throw ApiError.forbidden('You can only export your own records.');
    }
    return user.studentId;
  }

  if (!requested) throw ApiError.badRequest('Choose a student to export.');
  return requested;
}

export async function generateReport(req: Request, res: Response) {
  const kind = req.params.kind as ReportKind;
  const { format } = req.query as { format: 'pdf' | 'excel' };

  let table: ReportTable;
  let filename: string;

  if (kind === 'subject') {
    const subjectId = (req.query as { subjectId?: string }).subjectId;
    if (!subjectId) throw ApiError.badRequest('Choose a subject to export.');
    const user = requireUser(req);
    if (user.role === Role.STUDENT) {
      throw ApiError.forbidden('Class reports are available to staff only.');
    }
    await assertSubjectAccess(req, subjectId);
    table = await buildSubjectReport(subjectId);
    filename = `class-report-${subjectId.slice(0, 8)}`;
  } else {
    const studentId = resolveStudentId(req);
    switch (kind) {
      case 'attendance':
        table = await buildStudentAttendanceReport(studentId);
        filename = 'attendance-report';
        break;
      case 'marks':
        table = await buildStudentMarksReport(studentId);
        filename = 'class-test-marks-report';
        break;
      case 'assignments':
        table = await buildStudentAssignmentReport(studentId);
        filename = 'assignment-report';
        break;
      case 'performance':
        table = await buildStudentPerformanceReport(studentId);
        filename = 'overall-performance-report';
        break;
      default:
        throw ApiError.badRequest('Unknown report type.');
    }
  }

  if (format === 'excel') {
    await streamExcel(res, table, filename);
    return;
  }
  streamPdf(res, table, filename);
}
