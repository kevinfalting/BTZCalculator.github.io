// Pure date logic for the BTZ calculator. No DOM, no dependencies.
// All dates are handled in the browser's local timezone.
//
// Loaded as a classic <script> in the browser (functions become globals) so
// the page works when opened directly via file://. The module.exports guard at
// the bottom lets Node require it for tests; it is a no-op in the browser.

// Parse a "YYYY-MM-DD" string into a Date at local midnight.
// Returns null for empty, malformed, or out-of-range input.
function parseLocalDate(str) {
  // Year is \d{4,}: HTML date inputs permit years beyond 9999, but require
  // at least 4 digits, matching the "YYYY-MM-DD" format.
  const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(str ?? '');
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1; // Date months are 0-indexed
  const day = Number(match[3]);

  const date = new Date(year, month, day);
  // Reject values that rolled over (e.g. month 13 or day 45).
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

// Add n months to a date, clamping to the last valid day of the target month
// (Jan 31 + 1 month -> Feb 28/29, never overflowing into March). n may be negative.
function addMonths(date, n) {
  const total = date.getMonth() + n;
  const newYear = date.getFullYear() + Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12;

  const lastDayOfMonth = new Date(newYear, newMonth + 1, 0).getDate();
  const newDay = Math.min(date.getDate(), lastDayOfMonth);

  return new Date(newYear, newMonth, newDay);
}

// Quarter index 0..3 (Q1 = Jan–Mar = 0).
function quarterOf(date) {
  return Math.floor(date.getMonth() / 3);
}

// "March 15, 2024" — local time, fixed en-US locale, no ordinal.
function formatLong(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// "December 2023" — local time, fixed en-US locale.
function formatMonthYear(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

// Format a date as "YYYY-MM-DD" from its LOCAL components (suitable for an
// <input type="date"> value). Avoids toISOString(), which would shift the day
// across the UTC boundary in western timezones.
function toISODate(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Board/selection month per AFI 36-2502 (26 Sep 2024), Table 2.7, keyed by the
// quarter the BTZ promotion (sew-on) falls in:
//   Jan–Mar (Q1) -> December (prior year)
//   Apr–Jun (Q2) -> March
//   Jul–Sep (Q3) -> June
//   Oct–Dec (Q4) -> September
function boardDateFrom(btzSewOn) {
  const year = btzSewOn.getFullYear();
  switch (quarterOf(btzSewOn)) {
    case 0: return new Date(year - 1, 11, 1); // December of prior year
    case 1: return new Date(year, 2, 1);      // March
    case 2: return new Date(year, 5, 1);      // June
    case 3: return new Date(year, 8, 1);      // September
  }
}

// Compute the three projected promotion dates from the raw input strings.
// Returns { error } on bad input, otherwise { sraSewOn, btzSewOn, boardDate }.
function computeBTZDates(enlistmentStr, a1cStr) {
  const enlistment = parseLocalDate(enlistmentStr);
  const a1c = parseLocalDate(a1cStr);

  if (!enlistment || !a1c) {
    return { error: 'Enter valid enlistment and A1C dates.' };
  }
  if (a1c < enlistment) {
    return { error: 'You cannot sew on A1C before your Enlistment Date.' };
  }

  // AFI 36-2502 (26 Sep 2024) para 2.2.1: fully qualified for SrA at
  // 36 months TIS and 20 months TIG, or 28 months TIG, whichever occurs first.
  const tis36 = addMonths(enlistment, 36); // 36 months Time In Service
  const tig20 = addMonths(a1c, 20);        // 20 months Time In Grade
  const tig28 = addMonths(a1c, 28);        // 28 months Time In Grade

  let sraSewOn;
  if (tig28 <= tis36) {
    sraSewOn = tig28;
  } else if (tig20 <= tis36) {
    sraSewOn = tis36;
  } else {
    sraSewOn = tig20;
  }

  // AFI 36-2502 para 2.3.1: BTZ advances promotion to six months prior to the
  // fully qualified phase point.
  const btzSewOn = addMonths(sraSewOn, -6);
  const boardDate = boardDateFrom(btzSewOn);

  return { sraSewOn, btzSewOn, boardDate };
}

// Node (tests) only — guarded so it is inert in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseLocalDate,
    addMonths,
    quarterOf,
    formatLong,
    formatMonthYear,
    toISODate,
    boardDateFrom,
    computeBTZDates,
  };
}
