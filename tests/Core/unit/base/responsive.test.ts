import assert from 'node:assert/strict';
import test from 'node:test';
import { getBreakpointIndex, resolveResponsive, resolveResponsiveInput, resolveResponsiveWithDefaults } from '../../../../src/core/base/responsive';

test('bands use the generated single responsive definition', () => {
    assert.equal(getBreakpointIndex(767), 1);
    assert.equal(getBreakpointIndex(768), 2);
    assert.equal(getBreakpointIndex(1024), 0);
});

test('author tuples are exact, skip null, and never inherit desktop', () => {
    assert.deepEqual(resolveResponsive([16, null, 0]), [16, null, 0]);
    assert.deepEqual(resolveResponsive([null, 16, 20]), [null, 16, 20]);
    for (const invalid of [12, [24], [24, 12], [], [0, undefined, null]]) {
        assert.throws(() => resolveResponsive(invalid as never), /tuple|three|desktop/);
    }
});

test('internal computed scalars may broadcast without changing authored prop types', () => {
    assert.deepEqual(resolveResponsiveInput(13.25), [13.25, 13.25, 13.25]);
});

test('null preserves each component default instead of inheriting desktop', () => {
    assert.deepEqual(
        resolveResponsiveWithDefaults([null, 16, null], [24, 8, 12]),
        [24, 16, 12],
    );
    assert.deepEqual(resolveResponsiveWithDefaults(undefined, [24, 8, null]), [24, 8, null]);
    assert.throws(() => resolveResponsiveWithDefaults([16] as never, [24, 8, 12]), /desktop/);
});
