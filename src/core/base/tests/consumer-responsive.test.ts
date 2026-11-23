import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveResponsive } from '../responsive';

test('single-entry responsive tuples retain control geometry on mobile and tablet', () => {
  assert.deepEqual(resolveResponsive([14]), [14, 14, 14]);
  assert.deepEqual(resolveResponsive([32]), [32, 32, 32]);
  assert.deepEqual(resolveResponsive(['center']), ['center', 'center', 'center']);
});

test('explicit null still means skip, not a desktop fallback', () => {
  assert.deepEqual(resolveResponsive([14, null, null]), [14, null, null]);
  assert.deepEqual(resolveResponsive([null, 12, 16]), [null, 12, 16]);
});
