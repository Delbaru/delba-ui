import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDisplay, normalizeDisplayValue, parseValue } from '../../../src/core/fields/date';

test('date parsing rejects overflow and keeps valid ISO and display values', () => {
  const leapDay = parseValue('2024-02-29');
  assert.ok(leapDay);
  assert.equal(formatDisplay(leapDay), '29.02.2024');
  assert.equal(leapDay, '2024-02-29');
  assert.equal(parseValue('29.02.2024'), leapDay);
  assert.equal(parseValue('29.02.2023'), null);
  assert.equal(parseValue('31.04.2025'), null);
});

test('display normalization keeps partial input and renders a valid ISO day', () => {
  assert.equal(normalizeDisplayValue('   '), '');
  assert.equal(normalizeDisplayValue('29.02.'), '29.02.');
  assert.equal(normalizeDisplayValue('2024-02-29'), '29.02.2024');
});
