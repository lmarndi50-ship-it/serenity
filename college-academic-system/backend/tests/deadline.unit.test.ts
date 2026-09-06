/**
 * Unit tests for the deadline-reminder selection logic. Pure functions only —
 * no database, no server.
 *
 *   npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LEAD_HOURS,
  buildDeadlineMessage,
  buildDeadlineTitle,
  calendarDaysUntil,
  deadlineDedupeKey,
  describeDueDate,
  isDueWithin,
} from '../src/services/deadline.service';

const NOW = new Date(Date.UTC(2026, 8, 6, 9, 0, 0)); // 2026-09-06 09:00 UTC
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

test('the default lead window is 24 hours', () => {
  assert.equal(DEFAULT_LEAD_HOURS, 24);
});

// ---------------------------------------------------------------------------
// isDueWithin — the window is [now, now + leadHours)
// ---------------------------------------------------------------------------

test('isDueWithin includes deadlines inside the window', () => {
  assert.equal(isDueWithin(hoursFromNow(1), NOW, 24), true);
  assert.equal(isDueWithin(hoursFromNow(23.9), NOW, 24), true);
});

test('isDueWithin includes a deadline exactly now, excludes one exactly at the edge', () => {
  assert.equal(isDueWithin(NOW, NOW, 24), true); // lower bound inclusive
  assert.equal(isDueWithin(hoursFromNow(24), NOW, 24), false); // upper bound exclusive
});

test('isDueWithin excludes deadlines that have already passed', () => {
  // An overdue assignment is flagged late on submission; reminding is noise.
  assert.equal(isDueWithin(hoursFromNow(-1), NOW, 24), false);
  assert.equal(isDueWithin(hoursFromNow(-72), NOW, 24), false);
});

test('isDueWithin respects a custom lead window', () => {
  assert.equal(isDueWithin(hoursFromNow(36), NOW, 24), false);
  assert.equal(isDueWithin(hoursFromNow(36), NOW, 48), true);
});

// ---------------------------------------------------------------------------
// calendarDaysUntil — whole UTC days, independent of time of day
// ---------------------------------------------------------------------------

test('calendarDaysUntil counts calendar days, not elapsed hours', () => {
  // 09:00 today -> 23:59 today is the same calendar day, despite ~15 hours.
  assert.equal(calendarDaysUntil(new Date(Date.UTC(2026, 8, 6, 23, 59)), NOW), 0);
  // 09:00 today -> 00:30 tomorrow is one calendar day, despite ~15 hours.
  assert.equal(calendarDaysUntil(new Date(Date.UTC(2026, 8, 7, 0, 30)), NOW), 1);
  assert.equal(calendarDaysUntil(new Date(Date.UTC(2026, 8, 9, 12, 0)), NOW), 3);
});

// ---------------------------------------------------------------------------
// Phrasing
// ---------------------------------------------------------------------------

test('describeDueDate says today / tomorrow / an explicit date', () => {
  assert.equal(describeDueDate(new Date(Date.UTC(2026, 8, 6, 23, 59)), NOW), 'today');
  assert.equal(describeDueDate(new Date(Date.UTC(2026, 8, 7, 8, 0)), NOW), 'tomorrow');
  assert.equal(describeDueDate(new Date(Date.UTC(2026, 8, 12, 8, 0)), NOW), 'on 2026-09-12');
});

test('buildDeadlineTitle matches how close the deadline is', () => {
  assert.equal(buildDeadlineTitle(new Date(Date.UTC(2026, 8, 6, 20, 0)), NOW), 'Assignment due today');
  assert.equal(
    buildDeadlineTitle(new Date(Date.UTC(2026, 8, 7, 20, 0)), NOW),
    'Assignment due tomorrow',
  );
  assert.equal(
    buildDeadlineTitle(new Date(Date.UTC(2026, 8, 10, 20, 0)), NOW),
    'Assignment deadline approaching',
  );
});

test('buildDeadlineMessage names the subject and the assignment', () => {
  const message = buildDeadlineMessage(
    'Computer Networks',
    'OSI Model Report',
    new Date(Date.UTC(2026, 8, 7, 23, 59)),
    NOW,
  );
  // Mirrors the example notification in the product spec.
  assert.equal(message, 'Computer Networks: "OSI Model Report" is due tomorrow.');
});

// ---------------------------------------------------------------------------
// Idempotency key
// ---------------------------------------------------------------------------

test('deadlineDedupeKey is stable per assignment and distinct across assignments', () => {
  assert.equal(deadlineDedupeKey('abc'), 'assignment-due:abc');
  assert.equal(deadlineDedupeKey('abc'), deadlineDedupeKey('abc'));
  assert.notEqual(deadlineDedupeKey('abc'), deadlineDedupeKey('xyz'));
});
