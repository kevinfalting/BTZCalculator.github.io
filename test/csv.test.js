const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCSV,
  parseFlexibleDate,
  detectColumns,
  buildRecords,
  computeBulk,
  buildResultsCSV,
  buildTemplateCSV,
} = require('../js/csv.js');

test('parseCSV splits simple rows', () => {
  const rows = parseCSV('a,b,c\n1,2,3\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseCSV handles quoted fields with embedded commas and escaped quotes', () => {
  const rows = parseCSV('Name,Note\n"Smith, John","she said ""hi"""\n');
  assert.deepEqual(rows, [['Name', 'Note'], ['Smith, John', 'she said "hi"']]);
});

test('parseCSV handles CRLF line endings and a trailing newline', () => {
  const rows = parseCSV('a,b\r\n1,2\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['1', '2']]);
});

test('parseCSV drops blank lines', () => {
  const rows = parseCSV('a,b\n1,2\n\n3,4\n');
  assert.deepEqual(rows, [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('parseFlexibleDate accepts ISO dates', () => {
  const d = parseFlexibleDate('2024-03-15');
  assert.equal(d.getFullYear(), 2024);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 15);
});

test('parseFlexibleDate accepts M/D/YYYY dates', () => {
  const d = parseFlexibleDate('3/5/2024');
  assert.equal(d.getFullYear(), 2024);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 5);
});

test('parseFlexibleDate returns null for garbage', () => {
  assert.equal(parseFlexibleDate('not a date'), null);
});

test('detectColumns pre-fills a field when exactly one header matches', () => {
  const columns = detectColumns(['Airman Name', 'Date Joined', 'Date of Rank']);
  assert.deepEqual(columns.enlistment, { index: 1, candidates: [1] });
  assert.deepEqual(columns.a1c, { index: 2, candidates: [2] });
});

test('detectColumns leaves a field unresolved (index -1) when no header matches', () => {
  const columns = detectColumns(['Name', 'Notes']);
  assert.deepEqual(columns.enlistment, { index: -1, candidates: [] });
  assert.deepEqual(columns.a1c, { index: -1, candidates: [] });
});

test('detectColumns flags ambiguity (index -1) when multiple headers match', () => {
  // Both "Date of Rank" and "A1C Date" match the a1c pattern.
  const columns = detectColumns(['Name', 'Enlistment Date', 'Date of Rank', 'A1C Date']);
  assert.deepEqual(columns.a1c, { index: -1, candidates: [2, 3] });
});

test('buildRecords keeps extra columns (name, rank, SSN, unit, etc.) in cells', () => {
  const rows = [
    ['Rank', 'Name', 'Unit', 'Enlistment Date', 'A1C Date'],
    ['AB', 'Jane Doe', '1 FSS', '2023-01-15', '2023-07-15'],
  ];
  const { headers, records } = buildRecords(rows, { enlistmentCol: 3, a1cCol: 4 });
  assert.deepEqual(headers, ['Rank', 'Name', 'Unit', 'Enlistment Date', 'A1C Date']);
  assert.deepEqual(records[0], {
    cells: ['AB', 'Jane Doe', '1 FSS', '2023-01-15', '2023-07-15'],
    enlistment: '2023-01-15',
    a1c: '2023-07-15',
  });
});

test('buildRecords throws when enlistment/A1C columns are not resolved (-1)', () => {
  const rows = [['Name', 'Notes'], ['Jane', 'whatever']];
  assert.throws(() => buildRecords(rows, { enlistmentCol: -1, a1cCol: -1 }), /select which columns/);
});

test('buildRecords returns empty headers/records for empty input', () => {
  assert.deepEqual(buildRecords([], { enlistmentCol: 0, a1cCol: 1 }), { headers: [], records: [] });
});

test('computeBulk computes results for valid rows', () => {
  const records = [{ enlistment: '2023-01-15', a1c: '2023-07-15' }];
  const [r] = computeBulk(records);
  assert.equal(r.error, undefined);
  assert.equal(r.sraSewOn.getFullYear(), 2025);
  assert.equal(r.boardDate.getFullYear(), 2025);
});

test('computeBulk reports a per-row error without throwing for bad dates', () => {
  const records = [
    { enlistment: 'nonsense', a1c: '2023-07-15' },
    { enlistment: '2023-01-15', a1c: '2023-07-15' },
  ];
  const results = computeBulk(records);
  assert.ok(results[0].error);
  assert.equal(results[1].error, undefined);
});

test('computeBulk reports a per-row error when A1C precedes enlistment', () => {
  const records = [{ enlistment: '2024-06-01', a1c: '2024-01-01' }];
  const [r] = computeBulk(records);
  assert.ok(r.error);
});

test('buildResultsCSV writes ISO dates and quotes fields containing commas', () => {
  const csv = buildResultsCSV(
    ['Name', 'Enlistment Date', 'A1C Date'],
    [{ cells: ['Doe, Jane', '2023-01-15', '2023-07-15'], sraSewOn: new Date(2025, 10, 15), btzSewOn: new Date(2025, 4, 15), boardDate: new Date(2025, 2, 1) }]
  );
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'Name,Enlistment Date,A1C Date,SrA Sew-On,BTZ Sew-On,Board Date,Error');
  assert.equal(lines[1], '"Doe, Jane",2023-01-15,2023-07-15,2025-11-15,2025-05-15,2025-03-01,');
});

test('buildResultsCSV includes the error column for failed rows', () => {
  const csv = buildResultsCSV(
    ['Name', 'Enlistment Date', 'A1C Date'],
    [{ cells: ['Bad', 'nope', 'nope'], error: 'bad dates' }]
  );
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[1], 'Bad,nope,nope,,,,bad dates');
});

test('buildResultsCSV keeps extra original columns (rank, unit, etc.) in the output', () => {
  const csv = buildResultsCSV(
    ['Rank', 'Name', 'Unit', 'Enlistment Date', 'A1C Date'],
    [{ cells: ['AB', 'Jane Doe', '1 FSS', '2023-01-15', '2023-07-15'], sraSewOn: new Date(2025, 10, 15), btzSewOn: new Date(2025, 4, 15), boardDate: new Date(2025, 2, 1) }]
  );
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'Rank,Name,Unit,Enlistment Date,A1C Date,SrA Sew-On,BTZ Sew-On,Board Date,Error');
  assert.equal(lines[1], 'AB,Jane Doe,1 FSS,2023-01-15,2023-07-15,2025-11-15,2025-05-15,2025-03-01,');
});

test('buildTemplateCSV has the expected header row', () => {
  const csv = buildTemplateCSV();
  assert.equal(csv.split('\r\n')[0], 'Enlistment Date,A1C Date');
});
