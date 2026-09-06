import { NotificationType, SubmissionStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { toDateOnly } from '../utils/academics';

/**
 * Assignment deadline reminders.
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
 */

/** Submission states that still owe the student work. */
const OUTSTANDING: SubmissionStatus[] = [SubmissionStatus.PENDING];

export const DEFAULT_LEAD_HOURS = 24;

/** Stable per-assignment key, so a reminder is issued at most once. */
export function deadlineDedupeKey(assignmentId: string): string {
  return `assignment-due:${assignmentId}`;
}

/**
 * Is the deadline inside the reminder window — after `now` and less than
 * `leadHours` away? Already-passed deadlines are excluded: a reminder for
 * something overdue is noise, and the submission is flagged late anyway.
 */
export function isDueWithin(dueDate: Date, now: Date, leadHours: number): boolean {
  const msAway = dueDate.getTime() - now.getTime();
  return msAway >= 0 && msAway < leadHours * 3_600_000;
}

/** Whole calendar days (UTC) between two instants, ignoring the time of day. */
export function calendarDaysUntil(dueDate: Date, now: Date): number {
  const from = toDateOnly(now).getTime();
  const to = toDateOnly(dueDate).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** Human phrasing for how close the deadline is. */
export function describeDueDate(dueDate: Date, now: Date): string {
  const days = calendarDaysUntil(dueDate, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `on ${toDateOnly(dueDate).toISOString().slice(0, 10)}`;
}

export function buildDeadlineTitle(dueDate: Date, now: Date): string {
  const days = calendarDaysUntil(dueDate, now);
  if (days <= 0) return 'Assignment due today';
  if (days === 1) return 'Assignment due tomorrow';
  return 'Assignment deadline approaching';
}

export function buildDeadlineMessage(
  subjectName: string,
  title: string,
  dueDate: Date,
  now: Date,
): string {
  return `${subjectName}: "${title}" is due ${describeDueDate(dueDate, now)}.`;
}

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
