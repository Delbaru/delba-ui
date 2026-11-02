import assert from 'node:assert/strict';
import test from 'node:test';
import { pointerRatio } from '../usePointerRatio';

test('pointer ratio bounds horizontal/vertical tracks and remains finite for empty layout', () => {
    assert.equal(pointerRatio(60, 10, 100), 0.5);
    assert.equal(pointerRatio(-50, 10, 100), 0);
    assert.equal(pointerRatio(400, 10, 100), 1);
    assert.equal(pointerRatio(35, 10, 100, true), 0.75);
    assert.equal(pointerRatio(20, 10, 0), 0);
});
