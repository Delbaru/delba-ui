import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateNumberStep,
  isNumberCharacterAllowed,
  normalizeNumberOptions,
} from './number-input';

test('number options are finite, unique and ordered before stepping', () => {
  const options = normalizeNumberOptions([4, 2, 2, Number.NaN, Number.POSITIVE_INFINITY, 3]);
  assert.deepEqual(options, [2, 3, 4]);
  assert.equal(calculateNumberStep({ currentValue: '2', options, delta: 1 }), 3);
  assert.equal(calculateNumberStep({ currentValue: '3.5', options, delta: -1 }), 3);
  assert.equal(calculateNumberStep({ currentValue: '', options, delta: -1 }), 4);
});

test('number character policy rejects invalid text and minus for nonnegative ranges', () => {
  assert.equal(isNumberCharacterAllowed('7'), true);
  assert.equal(isNumberCharacterAllowed(','), true);
  assert.equal(isNumberCharacterAllowed('-', 0), false);
  assert.equal(isNumberCharacterAllowed('-', -1), true);
  assert.equal(isNumberCharacterAllowed('e'), false);
  assert.equal(isNumberCharacterAllowed('ArrowUp'), true);
});
