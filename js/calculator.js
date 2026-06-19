// DOM glue for the BTZ calculator. Loaded as a classic <script> after btz.js,
// so the btz.js functions are available as globals (no imports). This keeps the
// page working when opened directly via file://.

function calculate() {
  const error = document.getElementById('error');
  const btzBoardDate = document.getElementById('btzBoardDate');
  const sraBTZSewOnDate = document.getElementById('sraBTZSewOnDate');
  const sraSewOnDate = document.getElementById('sraSewOnDate');

  const enlistmentDate = document.getElementById('enlistmentDate').value;
  const a1cDate = document.getElementById('a1cDate').value;

  error.innerHTML = '';

  const result = computeBTZDates(enlistmentDate, a1cDate);
  if (result.error) {
    error.innerHTML = result.error;
    btzBoardDate.innerHTML = '';
    sraBTZSewOnDate.innerHTML = '';
    sraSewOnDate.innerHTML = '';
    return;
  }

  sraSewOnDate.innerHTML = formatLong(result.sraSewOn);
  sraBTZSewOnDate.innerHTML = formatLong(result.btzSewOn);
  btzBoardDate.innerHTML = formatMonthYear(result.boardDate);
}

document.addEventListener('DOMContentLoaded', function () {
  // Default both inputs to one year ago, like the original site.
  const oneYearAgo = toISODate(addMonths(new Date(), -12));
  document.getElementById('enlistmentDate').value = oneYearAgo;
  document.getElementById('a1cDate').value = oneYearAgo;

  document.getElementById('enlistmentDate').addEventListener('change', calculate);
  document.getElementById('a1cDate').addEventListener('change', calculate);

  setupThemeToggle();
  calculate();
});
