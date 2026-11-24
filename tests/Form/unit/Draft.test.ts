import assert from 'node:assert/strict';
import test from 'node:test';
import { acknowledgeDraft, createDraft, receiveDraft, resetDraft, sameValue, setField, snapshotValue } from '../../../src/core/Form/Draft';
import { decodeDraft, draftStorageKey, encodeDraft } from '../../../src/core/Form/Storage';

test('message acknowledgement preserves late text and newly selected same-named files', () => {
  const old = new File(['old'], 'a.txt');
  const fresh = new File(['new'], 'a.txt');
  const empty = { text: '', files: [] as File[] };
  const submitted = setField(setField(createDraft(empty), 'text', 'first'), 'files', [old]);
  const current = setField(setField(submitted, 'text', 'second'), 'files', [old, fresh]);
  const saved = acknowledgeDraft(current, submitted, empty, ['files']);
  assert.equal(saved.values.text, 'second');
  assert.deepEqual(saved.values.files, [fresh]);
  assert.equal(saved.values.files[0], fresh);
  assert.equal(sameValue(old, fresh), false);
  assert.equal(snapshotValue(submitted).values.files[0], old);
});

test('edit form reconciles server normalization without overwriting later edits or refresh', () => {
  const initial = createDraft({ title: 'old', note: 'original' });
  const submitted = setField(initial, 'title', 'draft');
  const current = setField(submitted, 'note', 'late');
  const saved = acknowledgeDraft(current, submitted, { title: 'Draft', note: 'original' });
  assert.deepEqual(saved.values, { title: 'Draft', note: 'late' });
  const refreshed = receiveDraft(saved, { title: 'Server', note: 'other' });
  assert.deepEqual(refreshed.values, { title: 'Server', note: 'late' });
  assert.deepEqual(resetDraft(refreshed, refreshed.baseline).values, { title: 'Server', note: 'other' });
});

test('change away and back is not the submitted revision', () => {
  const submitted = setField(createDraft({ text: '' }), 'text', 'first');
  const current = setField(setField(submitted, 'text', 'other'), 'text', 'first');
  assert.equal(acknowledgeDraft(current, submitted, { text: '' }).values.text, 'first');
});

test('scoped persistence saves text only and does not restore unknown keys', () => {
  const initial = { text: '', files: [] as File[] };
  const values = { text: 'draft', files: [new File(['x'], 'x.txt')] };
  assert.equal(encodeDraft(values, ['text', 'files']), '{"text":"draft"}');
  assert.deepEqual(decodeDraft('{"text":"draft","files":[{}],"other":"unsafe"}', initial, ['text', 'files']), { text: 'draft' });
  assert.notEqual(draftStorageKey('a:b', 'c'), draftStorageKey('a', 'b:c'));
  assert.notEqual(draftStorageKey('owner-a', 'room'), draftStorageKey('owner-b', 'room'));
});
