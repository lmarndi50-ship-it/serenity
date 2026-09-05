import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import type { AttendanceHealth, EventType, SubmissionStatus } from '@/types';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'assignment';

export function formatDate(value: string | Date | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? format(date, pattern) : '—';
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "d MMM yyyy, h:mm a");
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return '';
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

/**
 * Maps an attendance percentage to a tone using the thresholds the API
 * reports, so the UI never hard-codes 75 / 65.
 */
export function attendanceTone(
  value: number,
  thresholds: { good: number; warning: number } = { good: 75, warning: 65 },
): Tone {
  if (value >= thresholds.good) return 'success';
  if (value >= thresholds.warning) return 'warning';
  return 'danger';
}

export function healthTone(status: AttendanceHealth): 'success' | 'warning' | 'danger' {
  return status === 'GOOD' ? 'success' : status === 'WARNING' ? 'warning' : 'danger';
}

export function healthLabel(status: AttendanceHealth): string {
  return status === 'GOOD' ? 'Good' : status === 'WARNING' ? 'Warning' : 'Critical';
}

/** Marks colour scale: >=75 green, 50–74 orange, <50 red. */
export function marksTone(value: number): 'success' | 'warning' | 'danger' {
  if (value >= 75) return 'success';
  if (value >= 50) return 'warning';
  return 'danger';
}

export function submissionTone(status: SubmissionStatus): Tone {
  switch (status) {
    case 'SUBMITTED':
    case 'GRADED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'LATE':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function submissionLabel(status: SubmissionStatus): string {
  switch (status) {
    case 'NOT_SUBMITTED':
      return 'Not submitted';
    case 'PENDING':
      return 'Pending';
    case 'SUBMITTED':
      return 'Submitted';
    case 'LATE':
      return 'Late';
    case 'GRADED':
      return 'Graded';
    default:
      return status;
  }
}

export function eventTone(type: EventType): Tone {
  switch (type) {
    case 'TEST':
      return 'primary';
    case 'ASSIGNMENT':
      return 'assignment';
    case 'EXAM':
      return 'danger';
    case 'HOLIDAY':
      return 'success';
    case 'NOTICE':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function eventLabel(type: EventType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

/** Hex values used by charts, kept in step with the CSS token palette. */
export const CHART_COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  assignment: '#7c3aed',
  muted: '#94a3b8',
  grid: '#e2e8f0',
} as const;

export function toneHex(tone: Tone): string {
  switch (tone) {
    case 'success':
      return CHART_COLORS.success;
    case 'warning':
      return CHART_COLORS.warning;
    case 'danger':
      return CHART_COLORS.danger;
    case 'assignment':
      return CHART_COLORS.assignment;
    case 'primary':
      return CHART_COLORS.primary;
    default:
      return CHART_COLORS.muted;
  }
}

/** Splits an ISO date into the "27 MAY" shape used by the Upcoming list. */
export function splitDateBadge(value: string): { day: string; month: string } {
  const date = parseISO(value);
  if (!isValid(date)) return { day: '--', month: '' };
  return { day: format(date, 'd'), month: format(date, 'MMM').toUpperCase() };
}

const HONORIFICS = new Set(['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'ms', 'ms.', 'mrs', 'mrs.']);

/**
 * First name for a greeting, skipping any leading honorific — otherwise
 * "Dr. Meera Kanungo" greets the user as "Dr.".
 */
export function greetingName(fullName: string | undefined | null): string {
  if (!fullName) return 'there';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts.find((part) => !HONORIFICS.has(part.toLowerCase()));
  return first ?? parts[0] ?? 'there';
}

/** Family name with any honorific kept, e.g. "Dr. Sharma" for faculty. */
export function surnameWithTitle(fullName: string | undefined | null): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const title = HONORIFICS.has(parts[0].toLowerCase()) ? `${parts[0]} ` : '';
  return `${title}${parts[parts.length - 1]}`;
}
