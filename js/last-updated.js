// Shows a subtle "Last updated" timestamp in the footer, sourced from the
// repo's most recent commit via the GitHub API. Purely cosmetic and
// best-effort: any failure (network, rate limit, unexpected response) is a
// silent no-op with no console output, and nothing renders until a result
// is in hand. Runs independently of the rest of the page — nothing else
// depends on it, so it can't block or break anything else.

function formatUpdatedAt(date) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(date);
  return `${formatted} UTC`;
}

document.addEventListener('DOMContentLoaded', function () {
  try {
    fetch('https://api.github.com/repos/kevinfalting/BTZCalculator.github.io/commits?per_page=1')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((commits) => {
        const dateStr = commits && commits[0] && commits[0].commit && commits[0].commit.committer
          ? commits[0].commit.committer.date
          : null;
        const date = dateStr ? new Date(dateStr) : null;
        if (!date || isNaN(date)) return;

        const el = document.getElementById('lastUpdated');
        if (el) el.textContent = `Last updated ${formatUpdatedAt(date)}`;
      })
      .catch(() => {});
  } catch (e) {
    // Swallow everything — e.g. fetch unsupported in this browser.
  }
});
