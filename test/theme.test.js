const { test } = require('node:test');
const assert = require('node:assert/strict');

const { nextThemeChoice } = require('../js/theme.js');

test('nextThemeChoice cycles system -> light -> dark -> system', () => {
  assert.equal(nextThemeChoice('system'), 'light');
  assert.equal(nextThemeChoice('light'), 'dark');
  assert.equal(nextThemeChoice('dark'), 'system');
});

test('nextThemeChoice treats null/unknown as system (so the next click is light)', () => {
  assert.equal(nextThemeChoice(null), 'light');
  assert.equal(nextThemeChoice(undefined), 'light');
  assert.equal(nextThemeChoice('garbage'), 'light');
});
