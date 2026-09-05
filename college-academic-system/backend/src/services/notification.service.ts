import { NotificationType, type Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { attendanceHealth, tallyAttendance } from '../utils/academics';
import { getThresholds } from './settings.service';

interface CreateNotificationInput {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
  /** When provided, the same key is never inserted twice for a user. */
  dedupeKey?: string;
}

export async function createNotification(
  input: CreateNotificationInput,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const data = {
    userId: input.userId,
    type: input.type ?? NotificationType.GENERAL,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    dedupeKey: input.dedupeKey ?? null,
  };

  if (!input.dedupeKey) {
    await client.notification.create({ data });
    return;
  }

  await client.notification.upsert({
    where: { userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey } },
    create: data,
    update: {},
  });
}

export async function createNotificationsForMany(
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>,
): Promise<void> {
  await Promise.all(userIds.map((userId) => createNotification({ ...input, userId })));
}

/**
 * Recomputes a student's attendance in one subject and raises a warning
 * notification when it has fallen below the configured threshold.
 * De-duplicated per student + subject + health band, so a student is told once
 * per band rather than after every single class.
 */
export async function evaluateAttendanceWarning(
  studentId: string,
  subjectId: string,
): Promise<void> {
  const [records, student, subject, thresholds] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId, subjectId }, select: { status: true } }),
    prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } }),
    prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }),
    getThresholds(),
  ]);

  if (!student || !subject || records.length === 0) return;

  const tally = tallyAttendance(records);
  const health = attendanceHealth(tally.percentage, thresholds);
  if (health === 'GOOD') return;

  const isCritical = health === 'CRITICAL';
  await createNotification({
    userId: student.userId,
    type: NotificationType.ATTENDANCE,
    title: isCritical ? 'Attendance critically low' : 'Attendance below requirement',
    message: `Your attendance in ${subject.name} is ${tally.percentage}%. ${
      isCritical
        ? 'You are at risk of being detained. Please meet your faculty advisor.'
        : 'Please improve your attendance to stay above the required minimum.'
    }`,
    link: '/attendance',
    dedupeKey: `attendance:${subjectId}:${health}`,
  });
}

export async function evaluateAttendanceWarnings(
  pairs: { studentId: string; subjectId: string }[],
): Promise<void> {
  for (const pair of pairs) {
    await evaluateAttendanceWarning(pair.studentId, pair.subjectId);
  }
}
