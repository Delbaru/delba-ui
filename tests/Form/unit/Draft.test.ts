import assert from 'node:assert/strict';
import test from 'node:test';
import { acknowledgeDraft, createDraft, receiveDraft, resetDraft, sameValue, setField, snapshotValue } from '../../../src/core/Form/Draft';
import { decodeDraft, draftStorageKey, encodeDraft, versionDraft } from '../../../src/core/Form/Storage';

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


test('domain equality permits normalized numeric and title refresh without discarding other edits', () => {
    const base = { title: 'Task', hours: '1', note: 'old' };
    const edited = setField(setField(setField(createDraft(base), 'title', ' Task '), 'hours', '1.00'), 'note', 'local');
    const equal = (field: keyof typeof base, a: string, b: string) =>
        field === 'hours' ? Number(a) === Number(b) : field === 'title' ? a.trim() === b.trim() : a === b;
    const refreshed = receiveDraft(edited, { title: 'Renamed', hours: '2', note: 'remote' }, equal);
    assert.deepEqual(refreshed.values, { title: 'Renamed', hours: '2', note: 'local' });
});


test('an externally changed revision with equal text survives acknowledgement', () => {
  const submitted = setField(createDraft({ text: '' }), 'text', 'sent');
  const changed = setField(submitted, 'text', 'sent', true);
  assert.equal(acknowledgeDraft(changed, submitted, { text: '' }).values.text, 'sent');
});

test('versioned browser drafts remain readable by the old text decoder', () => {
  const initial = { text: '', '$delbaDraftVersion': '' };
  const raw = encodeDraft({ text: 'same', '$delbaDraftVersion': 'a user field' }, ['text', '$delbaDraftVersion']);
  const a = versionDraft(raw, 'write-a');
  const b = versionDraft(raw, 'write-b');
  assert.notEqual(a, b);
  assert.deepEqual(decodeDraft(a, initial, ['text', '$delbaDraftVersion']), {
    text: 'same', '$delbaDraftVersion': 'a user field',
  });
  assert.deepEqual(decodeDraft(b, initial, ['text']), { text: 'same' });
});

test('removing and reattaching the same File object is a new occurrence', () => {
  const file = new File(['same bytes'], 'same.txt');
  const initial = { text: '', files: [] as File[] };
  const submitted = setField(createDraft(initial), 'files', [file]);
  const removed = setField(submitted, 'files', []);
  const current = setField(removed, 'files', [file]);
  assert.deepEqual(acknowledgeDraft(current, submitted, initial, ['files']).values.files, [file]);
});

test('adding the same File twice consumes only the original occurrence', () => {
  const file = new File(['same bytes'], 'same.txt');
  const initial = { text: '', files: [] as File[] };
  const submitted = setField(createDraft(initial), 'files', [file]);
  const current = setField(submitted, 'files', [file, file]);
  const settled = acknowledgeDraft(current, submitted, initial, ['files']);
  assert.deepEqual(settled.values.files, [file]);
  assert.deepEqual(acknowledgeDraft(settled, submitted, initial, ['files']).values.files, [file]);
});

test('refresh exposes concurrent server changes without replacing dirty values', () => {
  const local = setField(createDraft({ title: 'old', note: 'old note' }), 'title', 'local');
  const refreshed = receiveDraft(local, { title: 'remote', note: 'new note' });
  assert.deepEqual(refreshed.values, { title: 'local', note: 'new note' });
  assert.deepEqual(refreshed.conflicts, { title: { previous: 'old', incoming: 'remote' } });
  const repeated = receiveDraft(refreshed, { title: 'remote', note: 'new note' });
  assert.deepEqual(repeated.conflicts, refreshed.conflicts);
  assert.deepEqual(setField(repeated, 'title', 'local').conflicts, {});
  assert.deepEqual(resetDraft(refreshed, refreshed.baseline).conflicts, {});
  assert.deepEqual(receiveDraft(refreshed, { title: 'local', note: 'new note' }).conflicts, {});
});

test('unchanged server values do not conflict and acknowledgement resolves submitted fields', () => {
  const local = setField(createDraft({ title: 'old' }), 'title', 'local');
  assert.deepEqual(receiveDraft(local, { title: 'old' }).conflicts, {});
  const refreshed = receiveDraft(local, { title: 'remote' });
  assert.deepEqual(acknowledgeDraft(refreshed, refreshed, { title: 'saved' }).conflicts, {});
});
