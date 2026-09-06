/**
 * Unit tests for the academic maths — the single source of truth behind every
 * percentage in CAMS. Pure functions, no database, no server.
 *
 *   npm run test:unit
 *
 * Uses Node's built-in test runner via tsx (no test framework dependency).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  attendanceHealth,
  attendancePercentage,
  formatDateOnly,
  marksPercentage,
  overallScore,
  percentage,
  round1,
  startOfIsoWeek,
  tallyAttendance,
  toDateOnly,
} from '../src/utils/academics';

// ---------------------------------------------------------------------------
// Documented defaults — a guard against a silent change to the spec's 30/40/30
// weighting or the 75/65 attendance bands.
// ---------------------------------------------------------------------------

test('default weights are 30/40/30 and sum to 1', () => {
  assert.deepEqual(DEFAULT_WEIGHTS, { attendance: 0.3, tests: 0.4, assignments: 0.3 });
  assert.equal(DEFAULT_WEIGHTS.attendance + DEFAULT_WEIGHTS.tests + DEFAULT_WEIGHTS.assignments, 1);
});

test('default thresholds are 75 / 65', () => {
  assert.deepEqual(DEFAULT_THRESHOLDS, { good: 75, warning: 65 });
});

// ---------------------------------------------------------------------------
// round1
// ---------------------------------------------------------------------------

test('round1 keeps one decimal place', () => {
  assert.equal(round1(87.64), 87.6);
  assert.equal(round1(87.65), 87.7); // rounds half up
  assert.equal(round1(100), 100);
  assert.equal(round1(0), 0);
});

// ---------------------------------------------------------------------------
// percentage — the safe divide behind everything else
// ---------------------------------------------------------------------------

test('percentage divides and rounds to one decimal', () => {
  assert.equal(percentage(1, 3), 33.3);
  assert.equal(percentage(2, 3), 66.7);
  assert.equal(percentage(50, 50), 100);
});

test('percentage returns 0 rather than NaN when the denominator is 0', () => {
  assert.equal(percentage(0, 0), 0);
  assert.equal(percentage(5, 0), 0);
});

test('percentage treats a non-positive denominator as 0', () => {
  assert.equal(percentage(5, -3), 0);
});

// ---------------------------------------------------------------------------
// attendancePercentage — LEAVE excluded from the denominator
// ---------------------------------------------------------------------------

test('attendance percentage excludes LEAVE from the denominator', () => {
  // 9 present, 1 absent, 5 leave -> 9 / (9 + 1) = 90%, leave ignored.
  assert.equal(attendancePercentage({ present: 9, absent: 1, leave: 5 }), 90);
});

test('attendance percentage is 0 when every class was leave (nothing counted)', () => {
  assert.equal(attendancePercentage({ present: 0, absent: 0, leave: 4 }), 0);
});

test('attendance percentage is 100 with no absences', () => {
  assert.equal(attendancePercentage({ present: 12, absent: 0, leave: 0 }), 100);
});

// ---------------------------------------------------------------------------
// tallyAttendance
// ---------------------------------------------------------------------------

test('tallyAttendance counts each status and separates total from considered', () => {
  const tally = tallyAttendance([
    { status: 'PRESENT' },
    { status: 'PRESENT' },
    { status: 'PRESENT' },
    { status: 'ABSENT' },
    { status: 'LEAVE' },
  ]);
  assert.equal(tally.present, 3);
  assert.equal(tally.absent, 1);
  assert.equal(tally.leave, 1);
  assert.equal(tally.total, 5); // includes leave
  assert.equal(tally.considered, 4); // excludes leave
  assert.equal(tally.percentage, 75); // 3 / 4
});

test('tallyAttendance handles an empty record set', () => {
  const tally = tallyAttendance([]);
  assert.deepEqual(tally, {
    present: 0,
    absent: 0,
    leave: 0,
    total: 0,
    considered: 0,
    percentage: 0,
  });
});

// ---------------------------------------------------------------------------
// attendanceHealth — band boundaries are inclusive at the bottom
// ---------------------------------------------------------------------------

test('attendanceHealth bands using default thresholds', () => {
  assert.equal(attendanceHealth(90), 'GOOD');
  assert.equal(attendanceHealth(75), 'GOOD'); // exactly the good threshold
  assert.equal(attendanceHealth(74.9), 'WARNING');
  assert.equal(attendanceHealth(65), 'WARNING'); // exactly the warning threshold
  assert.equal(attendanceHealth(64.9), 'CRITICAL');
  assert.equal(attendanceHealth(0), 'CRITICAL');
});

test('attendanceHealth honours custom thresholds', () => {
  const thresholds = { good: 80, warning: 60 };
  assert.equal(attendanceHealth(80, thresholds), 'GOOD');
  assert.equal(attendanceHealth(79.9, thresholds), 'WARNING');
  assert.equal(attendanceHealth(60, thresholds), 'WARNING');
  assert.equal(attendanceHealth(59.9, thresholds), 'CRITICAL');
});

// ---------------------------------------------------------------------------
// overallScore — weight normalisation and the 100 ceiling
// ---------------------------------------------------------------------------

test('overallScore blends the three components with default weights', () => {
  // 87.6*0.3 + 78.4*0.4 + 80*0.3 = 26.28 + 31.36 + 24 = 81.64 -> 81.6
  assert.equal(overallScore({ attendance: 87.6, tests: 78.4, assignments: 80 }), 81.6);
});

test('overallScore normalises weights that do not sum to 1', () => {
  const components = { attendance: 100, tests: 50, assignments: 80 };
  const proportional = overallScore(components, { attendance: 3, tests: 4, assignments: 3 });
  const withDefaults = overallScore(components); // 30/40/30
  // {3,4,3} normalises to exactly the default 30/40/30 proportions.
  assert.equal(proportional, withDefaults);
  assert.equal(proportional, 74); // 100*.3 + 50*.4 + 80*.3
});

test('overallScore cannot exceed 100 even with inflated weights', () => {
  const perfect = { attendance: 100, tests: 100, assignments: 100 };
  assert.equal(overallScore(perfect, { attendance: 5, tests: 5, assignments: 5 }), 100);
  assert.equal(overallScore(perfect, { attendance: 999, tests: 1, assignments: 1 }), 100);
});

test('overallScore returns 0 when all weights are 0', () => {
  assert.equal(
    overallScore({ attendance: 90, tests: 90, assignments: 90 }, { attendance: 0, tests: 0, assignments: 0 }),
    0,
  );
});

// ---------------------------------------------------------------------------
// marksPercentage
// ---------------------------------------------------------------------------

test('marksPercentage sums obtained over maximum across rows', () => {
  const result = marksPercentage([
    { obtained: 38, max: 50 },
    { obtained: 34, max: 50 },
  ]);
  assert.equal(result.obtained, 72);
  assert.equal(result.max, 100);
  assert.equal(result.percentage, 72);
});

test('marksPercentage is 0 across an empty set', () => {
  const result = marksPercentage([]);
  assert.deepEqual(result, { obtained: 0, max: 0, percentage: 0 });
});

// ---------------------------------------------------------------------------
// toDateOnly / formatDateOnly — attendance dates are stored as bare UTC dates
// ---------------------------------------------------------------------------

test('toDateOnly strips the time component in UTC', () => {
  const d = toDateOnly(new Date(Date.UTC(2026, 8, 6, 13, 45, 30)));
  assert.equal(d.toISOString(), '2026-09-06T00:00:00.000Z');
});

test('toDateOnly accepts an ISO string', () => {
  assert.equal(toDateOnly('2026-09-06T23:59:00Z').toISOString(), '2026-09-06T00:00:00.000Z');
});

test('formatDateOnly yields YYYY-MM-DD', () => {
  assert.equal(formatDateOnly(new Date(Date.UTC(2026, 8, 6, 9, 0, 0))), '2026-09-06');
});

// ---------------------------------------------------------------------------
// startOfIsoWeek — Monday-anchored, used to bucket the trend chart
// ---------------------------------------------------------------------------

// Anchored on the Unix epoch, whose weekday (Thursday) is universally known,
// so these expected Mondays are verifiable by hand.
test('startOfIsoWeek anchors to the preceding Monday', () => {
  const iso = (y: number, m: number, d: number) =>
    startOfIsoWeek(new Date(Date.UTC(y, m - 1, d))).toISOString().slice(0, 10);

  assert.equal(iso(1970, 1, 1), '1969-12-29'); // Thursday -> that week's Monday
  assert.equal(iso(1970, 1, 5), '1970-01-05'); // Monday -> itself
  assert.equal(iso(1970, 1, 4), '1969-12-29'); // Sunday -> previous Monday
  assert.equal(iso(1970, 1, 11), '1970-01-05'); // the next Sunday -> its Monday
});

test('startOfIsoWeek always returns a Monday at or before the input', () => {
  for (let offset = 0; offset < 21; offset += 1) {
    const input = new Date(Date.UTC(2026, 8, 6 + offset));
    const start = startOfIsoWeek(input);
    assert.equal(start.getUTCDay(), 1, 'result is a Monday');
    assert.ok(start.getTime() <= toDateOnly(input).getTime(), 'result is not after the input');
    const daysBack = (toDateOnly(input).getTime() - start.getTime()) / 86_400_000;
    assert.ok(daysBack >= 0 && daysBack < 7, 'within the same week');
  }
});
