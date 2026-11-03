import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeImgAnimate } from '../types';

test('normalizes the object change form', () => {
  assert.deepEqual(normalizeImgAnimate({ when: 'change', effect: 'veil', direction: -1, duration: 'slow' }), {
    effect: 'veil', direction: -1, duration: 'slow',
  });
});

test('rejects string and tuple aliases', () => {
  for (const input of ['fade', ['parallax'], ['parallax', { direction: -1 }]]) assert.equal(normalizeImgAnimate(input), undefined);
});

test('does not treat appearance and invalid values as image changes', () => {
  assert.equal(normalizeImgAnimate({ when: 'load', effect: 'fade' }), undefined);
  assert.equal(normalizeImgAnimate({ when: 'change', effect: 'unknown' }), undefined);
  assert.equal(normalizeImgAnimate(undefined), undefined);
});
