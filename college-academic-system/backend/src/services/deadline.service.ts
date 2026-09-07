import { NotificationType, SubmissionStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  DEFAULT_LEAD_HOURS,
  buildDeadlineMessage,
  buildDeadlineTitle,
  deadlineDedupeKey,
} from './deadline.rules';

/**
 * Assignment deadline reminders — the database side.
 *
 * Run by `npm run notify:deadlines` on a daily schedule (OS cron, a k8s
 * CronJob, or a scheduled GitHub Actions workflow). Deliberately a standalone
 * job rather than an in-process timer: the API can then run on more than one
 * instance without every instance sending its own copy, and the job is
 * directly testable.
 *
 * Re-running is safe. Each reminder carries a stable `dedupeKey`, and the
 * Notification table's unique (userId, dedupeKey) constraint means a student
 * is reminded once per assignment however often the job fires.
 *
 * The window and phrasing rules live in `deadline.rules.ts`, which imports no
 * database or configuration, so they stay unit-testable without a DATABASE_URL.
 */

/** Submission states that still owe the student work. */
const OUTSTANDING: SubmissionStatus[] = [SubmissionStatus.PENDING];

export interface DeadlineReminderResult {
  assignmentsInWindow: number;
  remindersSent: number;
  alreadyReminded: number;
}

/**
 * Notifies every student who has not yet submitted an assignment falling due
 * inside the lead window.
 */
export async function sendDeadlineReminders(
  options: { now?: Date; leadHours?: number } = {},
): Promise<DeadlineReminderResult> {
  const now = options.now ?? new Date();
  const leadHours = options.leadHours ?? DEFAULT_LEAD_HOURS;
  const windowEnd = new Date(now.getTime() + leadHours * 3_600_000);

  const assignments = await prisma.assignment.findMany({
    where: { dueDate: { gte: now, lt: windowEnd } },
    include: {
      subject: { select: { name: true } },
      submissions: {
        where: { status: { in: OUTSTANDING } },
        select: { student: { select: { userId: true } } },
      },
    },
  });

  const candidates = assignments.flatMap((assignment) =>
    assignment.submissions.map((submission) => ({
      userId: submission.student.userId,
      type: NotificationType.ASSIGNMENT,
      title: buildDeadlineTitle(assignment.dueDate, now),
      message: buildDeadlineMessage(
        assignment.subject.name,
        assignment.title,
        assignment.dueDate,
        now,
      ),
      link: '/assignments',
      dedupeKey: deadlineDedupeKey(assignment.id),
    })),
  );

  if (candidates.length === 0) {
    return { assignmentsInWindow: assignments.length, remindersSent: 0, alreadyReminded: 0 };
  }

  // Filter out reminders already issued, so the reported count is truthful
  // rather than counting no-op upserts.
  const existing = await prisma.notification.findMany({
    where: {
      userId: { in: candidates.map((c) => c.userId) },
      dedupeKey: { in: candidates.map((c) => c.dedupeKey) },
    },
    select: { userId: true, dedupeKey: true },
  });
  const alreadySent = new Set(existing.map((e) => `${e.userId}|${e.dedupeKey}`));

  const fresh = candidates.filter((c) => !alreadySent.has(`${c.userId}|${c.dedupeKey}`));

  if (fresh.length > 0) {
    // skipDuplicates guards against a concurrent run inserting the same row.
    await prisma.notification.createMany({ data: fresh, skipDuplicates: true });
  }

  return {
    assignmentsInWindow: assignments.length,
    remindersSent: fresh.length,
    alreadyReminded: candidates.length - fresh.length,
  };
}

export { DEFAULT_LEAD_HOURS } from './deadline.rules';
