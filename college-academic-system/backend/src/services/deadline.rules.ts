import { toDateOnly } from '../utils/academics';

/**
 * Pure rules behind assignment deadline reminders — which deadlines fall in
 * the reminder window, how they are phrased, and the de-duplication key.
 *
 * Deliberately free of any database or configuration import, so it can be
 * unit-tested without a DATABASE_URL. `deadline.service.ts` holds the part
 * that actually touches Prisma.
 */

export const DEFAULT_LEAD_HOURS = 24;

/** Stable per-assignment key, so a reminder is issued at most once. */
export function deadlineDedupeKey(assignmentId: string): string {
  return `assignment-due:${assignmentId}`;
}

/**
 * Is the deadline inside the reminder window — at or after `now` and less than
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
