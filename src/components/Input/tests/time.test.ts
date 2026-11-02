import assert from 'node:assert/strict';
import test from 'node:test';

import { getMaskDisplay, getMaskSuffix, normalize, normalizeEdit, validate } from '../formats/time';

test('normalizes digits while enforcing 24-hour and minute limits', () => {
  assert.equal(normalize('9'), '09');
  assert.equal(normalize('2360'), '23:0');
  assert.equal(normalize('2599'), '2');
  assert.equal(validate('2360'), 'Введите время в формате 00:00');
  assert.equal(validate('23:59'), undefined);
});

test('maps native selections over the inserted colon and keeps null selections', () => {
  assert.deepEqual(normalizeEdit('1234', 3, 4), {
    value: '12:34',
    selectionStart: 4,
    selectionEnd: 5,
  });
  assert.deepEqual(normalizeEdit('12:34', null, null), {
    value: '12:34',
    selectionStart: null,
    selectionEnd: null,
  });
});

test('draws only the unentered mask suffix', () => {
  assert.equal(getMaskDisplay('12'), '12:__');
  assert.equal(getMaskSuffix('12'), ':__');
  assert.equal(getMaskSuffix('12:34'), '');
});
