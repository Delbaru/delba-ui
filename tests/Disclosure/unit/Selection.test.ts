import assert from 'node:assert/strict';
import test from 'node:test';
import { disclosureKeys, nextDisclosureKeys } from '../../../src/core/Disclosure/Selection';

test('single selection replaces the open item and honors collapsible', () => {
  assert.deepEqual(disclosureKeys(null), []);
  assert.deepEqual(disclosureKeys('one'), ['one']);
  assert.deepEqual(nextDisclosureKeys(['one'], 'two', 'toggle', { collapsible: false }), ['two']);
  assert.deepEqual(nextDisclosureKeys(['one'], 'one', 'toggle', { collapsible: true }), []);
  assert.equal(nextDisclosureKeys(['one'], 'one', 'toggle', { collapsible: false }), undefined);
});

test('multiple selection keeps independent items and reveal never toggles an open item', () => {
  const selection = ['one', 'two'] as const;
  const policy = { multiple: true, collapsible: false };
  assert.deepEqual(nextDisclosureKeys(selection, 'one', 'toggle', policy), ['two']);
  assert.deepEqual(nextDisclosureKeys(selection, 'three', 'reveal', policy), ['one', 'two', 'three']);
  assert.equal(nextDisclosureKeys(selection, 'two', 'reveal', policy), undefined);
  assert.deepEqual(selection, ['one', 'two']);
});
