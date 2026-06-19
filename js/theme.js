// Theme handling for the BTZ calculator. Loaded as a classic <script> before
// calculator.js. The module.exports guard at the bottom lets Node require the
// pure logic for tests; it is a no-op in the browser.
//
// Three modes: 'system' (default — follow the OS via CSS), 'light', 'dark'.
// 'system' is represented by the ABSENCE of a stored value and of the
// data-theme attribute, so the CSS prefers-color-scheme query stays in charge.

// Pure: given the current choice, return the next one in the cycle.
// Anything that isn't an explicit 'light'/'dark' counts as 'system'.
function nextThemeChoice(current) {
  if (current === 'light') return 'dark';
  if (current === 'dark') return 'system';
  return 'light'; // from 'system' (or null/unknown)
}

// --- Browser-only helpers (skipped under Node) ------------------------------

// The user's stored choice, or 'system' when none is saved.
function storedThemeChoice() {
  try {
    var t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch (e) {
    return 'system';
  }
}

// Apply a choice: 'system' clears the override so the OS preference (CSS) wins;
// 'light'/'dark' set an explicit override and persist it.
function applyThemeChoice(choice) {
  var root = document.documentElement;
  try {
    if (choice === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem('theme');
    } else {
      root.setAttribute('data-theme', choice);
      localStorage.setItem('theme', choice);
    }
  } catch (e) {
    // localStorage may be unavailable; still apply the attribute.
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
  }
}

var THEME_ICONS = { system: '🌓', light: '☀️', dark: '🌙' };

function setupThemeToggle() {
  var button = document.getElementById('themeToggle');
  if (!button) return;

  function render() {
    var choice = storedThemeChoice();
    button.textContent = THEME_ICONS[choice];
    button.setAttribute('aria-label', 'Theme: ' + choice + ' (click to change)');
    button.title = 'Theme: ' + choice + ' (click to change)';
  }

  render();
  button.addEventListener('click', function () {
    applyThemeChoice(nextThemeChoice(storedThemeChoice()));
    render();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { nextThemeChoice };
}
