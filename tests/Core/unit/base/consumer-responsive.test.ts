import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveResponsive } from '../../../../src/core/base/responsive';

test('short responsive tuples are rejected instead of inheriting desktop', () => {
  for (const input of [[14], [32], ['center'], [24, 16]])
    assert.throws(() => resolveResponsive(input as never), /desktop|tuple/);
});

test('explicit null still means skip, not a desktop fallback', () => {
  assert.deepEqual(resolveResponsive([14, null, null]), [14, null, null]);
  assert.deepEqual(resolveResponsive([null, 12, 16]), [null, 12, 16]);
});
