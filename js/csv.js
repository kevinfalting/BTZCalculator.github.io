// Pure CSV parsing/building logic for the bulk BTZ importer. No DOM.
// Loaded as a classic <script> after btz.js, so parseLocalDate/toISODate/
// computeBTZDates are already globals (same convention as calculator.js).
// In Node, the require() below populates these module-scoped bindings instead.

var parseLocalDate, toISODate, computeBTZDates;
if (typeof module !== 'undefined' && module.exports) {
  ({ parseLocalDate, toISODate, computeBTZDates } = require('./btz.js'));
}

// Split CSV text into rows of raw string fields. Handles quoted fields
// (with embedded commas/newlines/escaped "") and both \n and \r\n line
// endings. No external dependency, matching the rest of this codebase.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // Ignore; \n (bare or in \r\n) ends the row.
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  // Last field/row, unless the file ended cleanly on a newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

// Header names are free text in the wild (MEL exports, hand-typed rosters,
// etc.), so match loosely by substring instead of requiring exact columns.
const HEADER_PATTERNS = {
  enlistment: /enlist|join|tafmsd/i,
  a1c: /a1c|date of rank|\bdor\b/i,
};

// All header indices matching a pattern, so callers can tell "no match",
// "exactly one match" (safe to guess), and "several matches" (ambiguous,
// needs a human) apart.
function findAllColumns(headerRow, pattern) {
  const matches = [];
  headerRow.forEach((h, i) => {
    if (pattern.test(h)) matches.push(i);
  });
  return matches;
}

// Best-guess column for each field, plus every candidate that matched so
// the UI can flag ambiguity instead of silently picking one. `index` is
// only pre-filled when exactly one column matched; a 0- or 2+-candidate
// field is left at -1 for a human to resolve.
function detectColumns(headerRow) {
  const fields = {};
  for (const field of ['enlistment', 'a1c']) {
    const candidates = findAllColumns(headerRow, HEADER_PATTERNS[field]);
    fields[field] = { index: candidates.length === 1 ? candidates[0] : -1, candidates };
  }
  return fields;
}

// Accepts "YYYY-MM-DD" (delegates to btz.js's parseLocalDate) or the common
// spreadsheet export format "M/D/YYYY" / "MM/DD/YYYY".
function parseFlexibleDate(str) {
  const trimmed = (str ?? '').trim();

  const iso = parseLocalDate(trimmed);
  if (iso) return iso;

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4,})$/.exec(trimmed);
  if (slash) {
    const [, month, day, year] = slash;
    return parseLocalDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  return null;
}

// Turn raw CSV rows (including header) into { headers, records }, using the
// explicit column indices the caller resolved (via detectColumns and/or a
// user's manual picks in the UI — this function doesn't guess). Each record
// keeps its full original row (`cells`) alongside the { enlistment, a1c }
// fields we need to calculate, so callers can hand back the airman's whole
// roster row untouched, plus our results, rather than discarding whatever
// columns we didn't ask for (name, rank, SSN, unit, etc.) — we don't need
// to know what those columns are, only where the two dates live.
function buildRecords(rows, columns) {
  if (rows.length === 0) return { headers: [], records: [] };

  const [headerRow, ...dataRows] = rows;
  const { enlistmentCol, a1cCol } = columns;

  if (enlistmentCol === -1 || a1cCol === -1) {
    throw new Error('Please select which columns contain the Enlistment Date and A1C Date.');
  }

  const records = dataRows.map((cells) => ({
    cells,
    enlistment: (cells[enlistmentCol] ?? '').trim(),
    a1c: (cells[a1cCol] ?? '').trim(),
  }));

  return { headers: headerRow, records };
}

// Run computeBTZDates over a batch of { enlistment, a1c } records. Dates
// are re-parsed here (via parseFlexibleDate) so CSV rows can use either ISO
// or M/D/YYYY dates, then handed to computeBTZDates as ISO strings since
// that's the format it expects.
function computeBulk(records) {
  return records.map((record) => {
    const enlistment = parseFlexibleDate(record.enlistment);
    const a1c = parseFlexibleDate(record.a1c);

    if (!enlistment || !a1c) {
      return { ...record, error: 'Enter valid enlistment and A1C dates.' };
    }

    const result = computeBTZDates(toISODate(enlistment), toISODate(a1c));
    if (result.error) {
      return { ...record, error: result.error };
    }

    return {
      ...record,
      sraSewOn: result.sraSewOn,
      btzSewOn: result.btzSewOn,
      boardDate: result.boardDate,
    };
  });
}

// Quote a CSV field only if it needs it (contains a comma, quote, or newline).
function csvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const APPENDED_HEADERS = ['SrA Sew-On', 'BTZ Sew-On', 'Board Date', 'Error'];

// Build a downloadable CSV that hands back the airman's original row
// (whatever columns it had) with our four result columns appended, rather
// than replacing their data with only the fields we needed. Dates are
// written in ISO form (sortable, unambiguous) rather than the "March 15,
// 2024" display format used on-page.
function buildResultsCSV(headers, results) {
  const lines = [[...headers, ...APPENDED_HEADERS].map(csvField).join(',')];

  for (const r of results) {
    lines.push([
      ...r.cells.map(csvField),
      csvField(r.sraSewOn ? toISODate(r.sraSewOn) : ''),
      csvField(r.btzSewOn ? toISODate(r.btzSewOn) : ''),
      csvField(r.boardDate ? toISODate(r.boardDate) : ''),
      csvField(r.error ?? ''),
    ].join(','));
  }

  return lines.join('\r\n') + '\r\n';
}

// A starter CSV so users know the expected columns without guessing.
function buildTemplateCSV() {
  return [
    'Enlistment Date,A1C Date',
    '2023-01-15,2023-07-15',
  ].join('\r\n') + '\r\n';
}

// Node (tests) only — guarded so it is inert in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSV,
    parseFlexibleDate,
    detectColumns,
    buildRecords,
    computeBulk,
    buildResultsCSV,
    buildTemplateCSV,
  };
}
