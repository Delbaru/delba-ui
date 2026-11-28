import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveImgChange } from '../../../../src/components/Img/swap/types';

test('normalizes the object change form', () => {
  assert.deepEqual(resolveImgChange({ effect: 'veil', direction: -1, duration: 'slow' }), {
    effect: 'veil', direction: -1, duration: 'slow',
  });
});

test('rejects legacy change forms', () => {
  for (const input of ['fade', ['parallax'], { when: 'change', effect: 'veil' }]) {
    assert.equal(resolveImgChange(input), undefined);
  }
});

test('does not treat appearance and invalid values as image changes', () => {
  assert.equal(resolveImgChange({ when: 'load', effect: 'fade' }), undefined);
  assert.equal(resolveImgChange({ effect: 'unknown' }), undefined);
  assert.equal(resolveImgChange(undefined), undefined);
});
