import assert from 'node:assert/strict';
import test from 'node:test';

import { isPerspective3dSettled, perspectiveFrameEase } from './perspective3d';

const rest = { rotateX: 0, rotateY: 0, translateX: 0, translateY: 0, scale: 1, translateZ: 0 };

test('changing direction cannot stop motion while the smoothed target is still moving', () => {
  assert.equal(isPerspective3dSettled(rest, rest, { ...rest, translateX: 4 }), false);
  assert.equal(isPerspective3dSettled({ ...rest, rotateY: 0.1 }, rest, rest), false);
  assert.equal(isPerspective3dSettled({ ...rest, translateX: 0.0005 }, rest, rest), true);
});

test('damping covers the same distance over time at 60 and 144 Hz', () => {
  const at60 = Math.pow(1 - perspectiveFrameEase(0.045, 1), 60);
  const at144 = Math.pow(1 - perspectiveFrameEase(0.045, 60 / 144), 144);
  assert.ok(Math.abs(at60 - at144) < 1e-12);
});
