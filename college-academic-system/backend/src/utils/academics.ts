import { AttendanceStatus } from '@prisma/client';

export type AttendanceHealth = 'GOOD' | 'WARNING' | 'CRITICAL';

export interface ScoreWeights {
  attendance: number;
  tests: number;
  assignments: number;
}

export interface AttendanceThresholds {
  good: number;
  warning: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  attendance: 0.3,
  tests: 0.4,
  assignments: 0.3,
};

export const DEFAULT_THRESHOLDS: AttendanceThresholds = {
  good: 75,
  warning: 65,
};

/** Rounds to one decimal place, as every percentage in the UI is displayed. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Safe percentage: returns 0 rather than NaN when the denominator is 0. */
export function percentage(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return round1((numerator / denominator) * 100);
}

/**
 * Attendance percentage.
 * LEAVE is excluded from the denominator — an approved leave neither helps nor
 * hurts, which is how most Indian universities compute the figure.
 */
export function attendancePercentage(counts: {
  present: number;
  absent: number;
  leave: number;
}): number {
  const considered = counts.present + counts.absent;
  return percentage(counts.present, considered);
}

export function tallyAttendance(records: { status: AttendanceStatus }[]): {
  present: number;
  absent: number;
  leave: number;
  total: number;
  considered: number;
  percentage: number;
} {
  let present = 0;
  let absent = 0;
  let leave = 0;
  for (const r of records) {
    if (r.status === 'PRESENT') present += 1;
    else if (r.status === 'ABSENT') absent += 1;
    else leave += 1;
  }
  const considered = present + absent;
  return {
    present,
    absent,
    leave,
    total: records.length,
    considered,
    percentage: attendancePercentage({ present, absent, leave }),
  };
}

export function attendanceHealth(
  pct: number,
  thresholds: AttendanceThresholds = DEFAULT_THRESHOLDS,
): AttendanceHealth {
  if (pct >= thresholds.good) return 'GOOD';
  if (pct >= thresholds.warning) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Overall score = weighted blend of the three component percentages.
 * Weights are normalised so a mis-configured admin setting cannot inflate the
 * score beyond 100.
 */
export function overallScore(
  components: { attendance: number; tests: number; assignments: number },
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): number {
  const sum = weights.attendance + weights.tests + weights.assignments;
  if (sum <= 0) return 0;
  const w = {
    attendance: weights.attendance / sum,
    tests: weights.tests / sum,
    assignments: weights.assignments / sum,
  };
  return round1(
    components.attendance * w.attendance +
      components.tests * w.tests +
      components.assignments * w.assignments,
  );
}

/** Marks percentage across many tests: total obtained over total maximum. */
export function marksPercentage(
  rows: { obtained: number; max: number }[],
): { obtained: number; max: number; percentage: number } {
  const obtained = rows.reduce((a, r) => a + r.obtained, 0);
  const max = rows.reduce((a, r) => a + r.max, 0);
  return { obtained, max, percentage: percentage(obtained, max) };
}

/** ISO date (YYYY-MM-DD) in UTC — attendance dates are stored as bare dates. */
export function toDateOnly(value: Date | string): Date {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatDateOnly(value: Date): string {
  return toDateOnly(value).toISOString().slice(0, 10);
}

/** Monday-anchored week start, used to bucket the attendance trend chart. */
export function startOfIsoWeek(value: Date): Date {
  const d = toDateOnly(value);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
