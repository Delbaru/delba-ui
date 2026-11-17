import assert from 'node:assert/strict';
import test from 'node:test';
import { moveSelectFocus, resolveSelectCatalog } from '../options';

test('async selection fallback preserves only the label and never republishes stale choices', () => {
  const saved = { value: 'a', label: 'Saved city' };
  const input = { options: [], value: 'a', multiple: false, showSelected: true, selectedFallback: [saved] } as const;
  const pending = resolveSelectCatalog(input);
  assert.equal(pending.selectedOption, saved);
  assert.equal(pending.hasValue, true);
  assert.deepEqual(pending.options, []);
  const updated = { value: 'a', label: 'Updated city' };
  assert.equal(resolveSelectCatalog({ ...input, options: [updated] }).selectedOption, updated);
  assert.equal(resolveSelectCatalog({ ...input, value: null }).selectedOption, null);
});

test('one catalog projection removes selected options and their empty group together', () => {
  const selected = { value: 'a', label: 'A' };
  const available = { value: 'b', label: 'B' };
  const catalog = resolveSelectCatalog({
    options: [
      { label: 'First', options: [selected] },
      { label: 'Second', options: [available] },
    ],
    value: ['a'],
    multiple: true,
    showSelected: false,
  });
  assert.deepEqual(catalog.selectedOptions, [selected]);
  assert.deepEqual(catalog.options, [available]);
  assert.deepEqual(
    catalog.items.map((item) => (item.type === 'group' ? item.label : item.option.value)),
    ['Second', 'b'],
  );
  assert.equal(catalog.hasValue, true);
});

test('keyboard movement wraps, initializes either direction and has no target in an empty list', () => {
  assert.equal(moveSelectFocus(-1, 1, 3), 0);
  assert.equal(moveSelectFocus(-1, -1, 3), 2);
  assert.equal(moveSelectFocus(2, 1, 3), 0);
  assert.equal(moveSelectFocus(0, -1, 3), 2);
  assert.equal(moveSelectFocus(0, 1, 0), -1);
});
