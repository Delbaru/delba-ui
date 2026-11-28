import assert from 'node:assert/strict';
import test from 'node:test';
import { changeSelection, changeSelectionKeys, emptySelection, rangeKeys, selectedItems, pruneSelection } from '../../../src/core/Collection/Selection';

const a = { id: 'a', label: 'old' };
const b = { id: 'b', label: 'second' };
const c = { id: 'c', label: 'third' };
const visible = new Map([['a', a], ['b', b], ['c', c]]);

test('key-only disclosure and record selection share single and multiple toggle semantics', () => {
  const keys = ['a'];
  assert.deepEqual(changeSelectionKeys(keys, ['b'], 'toggle', 'single'), ['b']);
  assert.deepEqual(changeSelectionKeys(keys, ['a'], 'toggle', 'single'), []);
  assert.deepEqual(changeSelectionKeys(keys, ['b'], 'toggle', 'multiple'), ['a', 'b']);
  assert.deepEqual(changeSelectionKeys(keys, ['a'], 'select', 'single'), ['a']);
  assert.deepEqual(keys, ['a']);
});

test('unknown records cannot replace a valid single selection', () => {
  const selected = changeSelection(emptySelection<typeof a>(), visible, ['a'], 'select', true, 'single');
  assert.deepEqual(changeSelection(selected, visible, ['missing'], 'select', true, 'single').ids, ['a']);
  assert.deepEqual(changeSelection(selected, visible, ['missing'], 'toggle', true, 'single').ids, ['a']);
});

test('range follows visible order in both directions and ignores unloaded anchor', () => {
  assert.deepEqual(rangeKeys(['a', 'b', 'c'], 'c', 'a'), ['a', 'b', 'c']);
  assert.deepEqual(rangeKeys(['a', 'c'], 'b', 'c'), ['c']);
  assert.deepEqual(rangeKeys(['a'], 'a', 'missing'), []);
});

test('selection is by ID; current records replace old selected previews', () => {
  const selected = changeSelection(emptySelection<typeof a>(), visible, ['a', 'b'], 'select', true);
  const updated = { ...a, label: 'new' };
  assert.deepEqual(selectedItems(selected, new Map([['a', updated]]), true), [updated, b]);
  assert.deepEqual(selectedItems(selected, new Map([['a', updated]]), false), [updated]);
  const toggled = changeSelection(selected, visible, ['a'], 'toggle', true);
  assert.deepEqual(toggled.ids, ['b']);
  assert.equal(toggled.retained.has('a'), false);
});

test('select all is limited to loaded keys; missing selection is explicit opt-in', () => {
  const selected = changeSelection(emptySelection<typeof a>(), visible, ['a'], 'select', false);
  const next = changeSelection(selected, new Map([['c', c]]), ['c'], 'select', false);
  assert.deepEqual(next.ids, ['c']);
  assert.equal(next.retained.size, 0);
  assert.deepEqual(emptySelection<typeof a>().ids, []);
});


test('non-retained removal is permanent even when an ID reappears', () => {
  const selected = changeSelection(emptySelection<typeof a>(), visible, ['a', 'b'], 'select', true);
  const pruned = pruneSelection(selected, new Map([['a', a]]), false);
  assert.deepEqual(pruned.ids, ['a']);
  assert.equal(pruned.anchor, null);
  assert.equal(pruned.retained.size, 0);
  assert.deepEqual(selectedItems(pruned, visible, false), [a]);
  assert.equal(pruneSelection(pruned, visible, false), pruned);
  assert.equal(pruneSelection(selected, new Map(), true), selected);
});

test('single selection replaces the previous ID and toggle clears it', () => {
  const first = changeSelection(emptySelection<typeof a>(), visible, ['a'], 'select', true, 'single');
  const next = changeSelection(first, visible, ['b'], 'select', true, 'single');
  assert.deepEqual(next.ids, ['b']);
  assert.deepEqual([...next.retained.keys()], ['b']);
  assert.deepEqual(changeSelection(next, visible, ['b'], 'toggle', true, 'single').ids, []);
});

test('retention remembers the last loaded version without requiring another selection gesture', () => {
  const selected = changeSelection(emptySelection<typeof a>(), visible, ['a'], 'select', true);
  const updated = { ...a, label: 'refreshed' };
  const refreshed = pruneSelection(selected, new Map([['a', updated]]), true);
  assert.deepEqual(selectedItems(pruneSelection(refreshed, new Map(), true), new Map(), true), [updated]);
  assert.equal(pruneSelection(refreshed, new Map([['a', updated]]), true), refreshed);
});


test('keyboard range starts from focused item without a loaded anchor and keeps that origin', () => {
  const keys = ['a', 'b', 'c'];
  const empty = emptySelection<typeof a>();
  const first = changeSelection(empty, visible, rangeKeys(keys, empty.anchor, 'b', 'c'), 'range', true, 'multiple', 'c');
  assert.deepEqual(first.ids, ['b', 'c']);
  assert.equal(first.anchor, 'c');
  const extended = changeSelection(first, visible, rangeKeys(keys, first.anchor, 'a', 'b'), 'range', true, 'multiple', 'b');
  assert.deepEqual(new Set(extended.ids), new Set(keys));
  assert.equal(extended.anchor, 'c');
  assert.deepEqual(rangeKeys(keys, 'offpage', 'b', 'c'), ['b', 'c']);
});
