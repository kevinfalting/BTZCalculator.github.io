const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseLocalDate,
  addMonths,
  quarterOf,
  formatLong,
  formatMonthYear,
  toISODate,
  boardDateFrom,
  computeBTZDates,
} = require('../js/btz.js');

// Helper: assert a Date matches given local components.
function assertYMD(date, year, month, day) {
  assert.equal(date.getFullYear(), year, 'year');
  assert.equal(date.getMonth(), month, 'month (0-indexed)');
  assert.equal(date.getDate(), day, 'day');
}

test('parseLocalDate parses a YYYY-MM-DD string as local midnight', () => {
  const d = parseLocalDate('2024-03-15');
  assertYMD(d, 2024, 2, 15);
  // Local, not UTC: the local day must be the 15th, never the 14th.
  assert.equal(d.getHours(), 0);
});

test('parseLocalDate returns null for empty input', () => {
  assert.equal(parseLocalDate(''), null);
});

test('parseLocalDate returns null for malformed input', () => {
  assert.equal(parseLocalDate('not-a-date'), null);
});

test('parseLocalDate returns null for an out-of-range date', () => {
  assert.equal(parseLocalDate('2024-13-45'), null);
});

test('addMonths adds whole months', () => {
  assertYMD(addMonths(new Date(2024, 0, 15), 36), 2027, 0, 15);
});

test('addMonths clamps to the end of a shorter month', () => {
  // Jan 31 + 1 month -> Feb 28 (2023 is not a leap year), never March.
  assertYMD(addMonths(new Date(2023, 0, 31), 1), 2023, 1, 28);
});

test('addMonths clamps to Feb 29 in a leap year', () => {
  assertYMD(addMonths(new Date(2024, 0, 31), 1), 2024, 1, 29);
});

test('addMonths subtracts months when given a negative count', () => {
  assertYMD(addMonths(new Date(2024, 2, 15), -6), 2023, 8, 15);
});

test('addMonths rolls over the year', () => {
  assertYMD(addMonths(new Date(2024, 10, 15), 3), 2025, 1, 15);
});

test('quarterOf returns 0..3 for each quarter', () => {
  assert.equal(quarterOf(new Date(2024, 0, 1)), 0);
  assert.equal(quarterOf(new Date(2024, 2, 31)), 0);
  assert.equal(quarterOf(new Date(2024, 3, 1)), 1);
  assert.equal(quarterOf(new Date(2024, 5, 30)), 1);
  assert.equal(quarterOf(new Date(2024, 6, 1)), 2);
  assert.equal(quarterOf(new Date(2024, 8, 30)), 2);
  assert.equal(quarterOf(new Date(2024, 9, 1)), 3);
  assert.equal(quarterOf(new Date(2024, 11, 31)), 3);
});

test('formatLong formats as "Month D, YYYY" with no ordinal', () => {
  assert.equal(formatLong(new Date(2024, 2, 15)), 'March 15, 2024');
});

test('formatMonthYear formats as "Month YYYY"', () => {
  assert.equal(formatMonthYear(new Date(2023, 11, 1)), 'December 2023');
});

test('toISODate formats local components, not UTC', () => {
  // A single-digit month and day must be zero-padded.
  assert.equal(toISODate(new Date(2024, 2, 5)), '2024-03-05');
  // Round-trips with parseLocalDate.
  const d = new Date(2023, 11, 31);
  assert.equal(toISODate(d), '2023-12-31');
  assertYMD(parseLocalDate(toISODate(d)), 2023, 11, 31);
});

test('boardDateFrom: Q1 sew-on -> December of the prior year', () => {
  assertYMD(boardDateFrom(new Date(2024, 1, 15)), 2023, 11, 1);
});

test('boardDateFrom: Q2 sew-on -> March of the same year', () => {
  assertYMD(boardDateFrom(new Date(2024, 4, 15)), 2024, 2, 1);
});

test('boardDateFrom: Q3 sew-on -> June of the same year', () => {
  assertYMD(boardDateFrom(new Date(2024, 7, 15)), 2024, 5, 1);
});

test('boardDateFrom: Q4 sew-on -> September of the same year', () => {
  assertYMD(boardDateFrom(new Date(2024, 10, 15)), 2024, 8, 1);
});

test('computeBTZDates errors when A1C date is before enlistment', () => {
  const result = computeBTZDates('2024-06-01', '2024-01-01');
  assert.ok(result.error, 'expected an error');
});

test('computeBTZDates errors when enlistment date is missing', () => {
  assert.ok(computeBTZDates('', '2024-01-01').error);
});

test('computeBTZDates errors when A1C date is missing', () => {
  assert.ok(computeBTZDates('2024-01-01', '').error);
});

test('computeBTZDates: TIG-28 governs (TIG-28 <= TIS-36)', () => {
  const r = computeBTZDates('2023-01-15', '2023-07-15');
  assert.equal(r.error, undefined);
  assertYMD(r.sraSewOn, 2025, 10, 15); // TIG-28 = Nov 15, 2025
  assertYMD(r.btzSewOn, 2025, 4, 15);  // -6 months = May 15, 2025
  assertYMD(r.boardDate, 2025, 2, 1);  // May is Q2 -> March 2025
});

test('computeBTZDates: TIS-36 governs (TIG-20 <= TIS-36 < TIG-28)', () => {
  const r = computeBTZDates('2022-01-01', '2023-01-01');
  assert.equal(r.error, undefined);
  assertYMD(r.sraSewOn, 2025, 0, 1); // TIS-36 = Jan 1, 2025
  assertYMD(r.btzSewOn, 2024, 6, 1); // -6 months = Jul 1, 2024
  assertYMD(r.boardDate, 2024, 5, 1); // July is Q3 -> June 2024
});

test('computeBTZDates: TIG-20 governs (TIS-36 < TIG-20)', () => {
  const r = computeBTZDates('2024-01-01', '2025-09-01');
  assert.equal(r.error, undefined);
  assertYMD(r.sraSewOn, 2027, 4, 1); // TIG-20 = May 1, 2027
  assertYMD(r.btzSewOn, 2026, 10, 1); // -6 months = Nov 1, 2026
  assertYMD(r.boardDate, 2026, 8, 1); // Nov is Q4 -> September 2026
});
