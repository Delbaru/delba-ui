import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeImgAnimate } from './types';

test('normalizes the object change form', () => {
  assert.deepEqual(normalizeImgAnimate({ when: 'change', effect: 'veil', direction: -1, duration: 'slow' }), {
    effect: 'veil', direction: -1, duration: 'slow',
  });
});

test('keeps legacy string and tuple forms', () => {
  assert.deepEqual(normalizeImgAnimate('fade'), { effect: 'fade' });
  assert.deepEqual(normalizeImgAnimate(['parallax', { direction: -1, duration: 0.4 }]), {
    effect: 'parallax', direction: -1, duration: 0.4,
  });
});

test('does not treat appearance and invalid values as image changes', () => {
  assert.equal(normalizeImgAnimate({ when: 'load', effect: 'fade' }), undefined);
  assert.equal(normalizeImgAnimate({ when: 'change', effect: 'unknown' }), undefined);
  assert.equal(normalizeImgAnimate(undefined), undefined);
});
