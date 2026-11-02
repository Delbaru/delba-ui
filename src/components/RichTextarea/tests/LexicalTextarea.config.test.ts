import assert from 'node:assert/strict';
import test from 'node:test';
import { editorLayout, validateEditorContent } from '../LexicalTextarea.config';
import type { LexicalTextareaChangePayload } from '../types';

const payload = (characters: number): LexicalTextareaChangePayload => ({ json: null, plainText: 'x'.repeat(characters), characters, isEmpty: characters === 0 });

test('required precedes lengths and custom validation while optional empty values remain allowed', () => {
  const rules = { required: true, emptyMessage: 'Required', minLength: 3, maxLength: 5, validate: () => 'Custom' };
  assert.equal(validateEditorContent(payload(0), rules), 'Required');
  assert.match(validateEditorContent(payload(2), rules) ?? '', /3/);
  assert.match(validateEditorContent(payload(6), rules) ?? '', /5/);
  assert.equal(validateEditorContent(payload(4), rules), 'Custom');
  assert.equal(validateEditorContent(payload(0), { emptyMessage: 'Required', minLength: 3 }), undefined);
});

test('editor frame dimensions and root layout remain distinct', () => {
  const layout = editorLayout({ p: [16, 12, 16], minH: [220, 180, 220], grow: [1, 1, 1], position: ['fixed', 'fixed', 'fixed'] });
  assert.deepEqual(layout.field, { p: [16, 12, 16], minH: [220, 180, 220] });
  assert.deepEqual(layout.root, { grow: [1, 1, 1], position: ['fixed', 'fixed', 'fixed'] });
});
