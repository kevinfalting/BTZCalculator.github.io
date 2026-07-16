// DOM glue for the bulk CSV importer. Loaded as a classic <script> after
// btz.js and csv.js, so their functions are available as globals.

let lastRows = [];
let lastHeaders = [];
let lastResults = [];

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function downloadCSV(filename, text) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Mirrors buildResultsCSV: shows every original column untouched, with our
// four result columns tacked on at the end, rather than picking out a
// subset (we don't track a "name" column at all — just where the two dates
// live — so there's nothing else to single out for display).
function renderBulkResults(headers, results) {
  const status = document.getElementById('bulkStatus');
  const tableWrap = document.getElementById('bulkTableWrap');
  const downloadBtn = document.getElementById('bulkDownload');

  const errorCount = results.filter((r) => r.error).length;
  status.innerHTML = `Processed ${results.length} row${results.length === 1 ? '' : 's'}` +
    (errorCount ? `, ${errorCount} with errors.` : '.');

  const headerCells = [...headers, 'SrA Sew-On', 'BTZ Sew-On', 'Board Date', 'Error']
    .map((h) => `<th>${escapeHTML(h)}</th>`).join('');

  const rows = results.map((r) => `
    <tr class="${r.error ? 'bulk-row-error' : ''}">
      ${r.cells.map((c) => `<td>${escapeHTML(c)}</td>`).join('')}
      <td>${r.error ? '' : formatLong(r.sraSewOn)}</td>
      <td>${r.error ? '' : formatLong(r.btzSewOn)}</td>
      <td>${r.error ? '' : formatMonthYear(r.boardDate)}</td>
      <td>${escapeHTML(r.error)}</td>
    </tr>
  `).join('');

  tableWrap.innerHTML = `
    <table class="bulk-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  downloadBtn.hidden = results.length === 0;
}

// Fill a <select> with the CSV's header names (value = column index), plus
// a disabled placeholder (value="-1") so an unresolved field (no confident
// guess) can't silently fall back to whatever option happens to be first.
function populateColumnSelect(select, headerRow, placeholder) {
  select.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = '-1';
  opt.textContent = placeholder;
  opt.disabled = true;
  select.appendChild(opt);
  headerRow.forEach((header, i) => {
    const dataOpt = document.createElement('option');
    dataOpt.value = String(i);
    dataOpt.textContent = header || `(column ${i + 1})`;
    select.appendChild(dataOpt);
  });
}

// Message shown under a mapping field when detectColumns couldn't
// confidently pick a column for it: several headers matched (ambiguous) or
// none did.
function describeFlag(field, headerRow) {
  if (field.candidates.length > 1) {
    const names = field.candidates.map((i) => `"${headerRow[i]}"`).join(', ');
    return `Multiple columns look like a match (${names}) — please confirm.`;
  }
  if (field.candidates.length === 0) {
    return "Couldn't detect this column — please select it.";
  }
  return null;
}

function showMapping(rows) {
  const headerRow = rows[0];
  const columns = detectColumns(headerRow);

  const enlistmentSelect = document.getElementById('bulkColEnlistment');
  const a1cSelect = document.getElementById('bulkColA1c');
  const enlistmentFlag = document.getElementById('bulkColEnlistmentFlag');
  const a1cFlag = document.getElementById('bulkColA1cFlag');

  populateColumnSelect(enlistmentSelect, headerRow, 'Select a column…');
  populateColumnSelect(a1cSelect, headerRow, 'Select a column…');

  enlistmentSelect.value = String(columns.enlistment.index);
  a1cSelect.value = String(columns.a1c.index);

  [
    [enlistmentFlag, describeFlag(columns.enlistment, headerRow)],
    [a1cFlag, describeFlag(columns.a1c, headerRow)],
  ].forEach(([flagEl, message]) => {
    flagEl.textContent = message ?? '';
    flagEl.hidden = !message;
  });

  document.getElementById('bulkMapping').hidden = false;
  maybeCalculate();
}

// Recalculates whenever a mapping dropdown changes (including the initial
// auto-detected guess), as long as both required fields resolve to a real
// column. Ambiguous or undetected fields leave a placeholder selected, so
// this naturally waits for the user to pick one instead of guessing.
function maybeCalculate() {
  const enlistmentSelect = document.getElementById('bulkColEnlistment');
  const a1cSelect = document.getElementById('bulkColA1c');

  if (enlistmentSelect.value === '-1' || a1cSelect.value === '-1') {
    const status = document.getElementById('bulkStatus');
    const tableWrap = document.getElementById('bulkTableWrap');
    const downloadBtn = document.getElementById('bulkDownload');
    lastHeaders = [];
    lastResults = [];
    tableWrap.innerHTML = '';
    downloadBtn.hidden = true;
    status.textContent =
      `Loaded ${lastRows.length - 1} row${lastRows.length - 1 === 1 ? '' : 's'}. ` +
      'Select the Enlistment Date and A1C Date columns above to calculate.';
    return;
  }

  runCalculate();
}

function runCalculate() {
  const status = document.getElementById('bulkStatus');
  const tableWrap = document.getElementById('bulkTableWrap');
  const downloadBtn = document.getElementById('bulkDownload');

  const columns = {
    enlistmentCol: Number(document.getElementById('bulkColEnlistment').value),
    a1cCol: Number(document.getElementById('bulkColA1c').value),
  };

  try {
    const { headers, records } = buildRecords(lastRows, columns);
    lastHeaders = headers;
    lastResults = computeBulk(records);
    renderBulkResults(lastHeaders, lastResults);
  } catch (err) {
    lastHeaders = [];
    lastResults = [];
    status.textContent = err.message;
    tableWrap.innerHTML = '';
    downloadBtn.hidden = true;
  }
}

function processBulkFile(file) {
  const status = document.getElementById('bulkStatus');
  const tableWrap = document.getElementById('bulkTableWrap');
  const downloadBtn = document.getElementById('bulkDownload');
  const mapping = document.getElementById('bulkMapping');

  tableWrap.innerHTML = '';
  downloadBtn.hidden = true;
  mapping.hidden = true;
  lastRows = [];
  lastHeaders = [];
  lastResults = [];

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    if (rows.length === 0) {
      status.textContent = 'That file looks empty.';
      return;
    }
    lastRows = rows;
    showMapping(rows);
  };
  reader.onerror = () => {
    status.textContent = 'Could not read that file.';
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('bulkFile');
  const downloadBtn = document.getElementById('bulkDownload');
  const templateBtn = document.getElementById('bulkTemplate');
  const dropzone = document.getElementById('bulkDropzone');
  const dropzoneText = document.getElementById('bulkDropzoneText');
  const enlistmentSelect = document.getElementById('bulkColEnlistment');
  const a1cSelect = document.getElementById('bulkColA1c');

  function handleFile(file) {
    dropzoneText.textContent = file.name;
    processBulkFile(file);
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  // The file input covers the dropzone (opacity: 0), so drag events land on
  // it and bubble here. preventDefault on dragover is what allows 'drop' to
  // fire instead of the browser navigating to the dropped file; preventDefault
  // on 'drop' itself suppresses the input's native drop-to-select behavior so
  // the file is only handled once, via handleFile.
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('bulk-dropzone-active');
    });
  });

  ['dragleave', 'dragend'].forEach((evt) => {
    dropzone.addEventListener(evt, () => {
      dropzone.classList.remove('bulk-dropzone-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('bulk-dropzone-active');
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  });

  enlistmentSelect.addEventListener('change', maybeCalculate);
  a1cSelect.addEventListener('change', maybeCalculate);

  downloadBtn.addEventListener('click', () => {
    downloadCSV('btz-results.csv', buildResultsCSV(lastHeaders, lastResults));
  });

  templateBtn.addEventListener('click', () => {
    downloadCSV('btz-template.csv', buildTemplateCSV());
  });
});
