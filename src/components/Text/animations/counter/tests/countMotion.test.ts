import assert from 'node:assert/strict';
import test from 'node:test';
import { createCountMotion } from '../countMotion';

test('counter retargets from the visible decimal frame, cancels old work and reaches the exact target', t => {
  let now = 0;
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  t.mock.method(performance, 'now', () => now);
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = id => { frames.delete(id); };
  t.after(() => {
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
  });
  const written: number[] = [];
  const motion = createCountMotion(1499.5, value => written.push(value));
  function tick(time: number) {
    now = time;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(time));
  }
  motion.animate(2499.75, 100, 2);
  assert.equal(written[0], 1499.5, 'First value must not reset to zero.');
  tick(40);
  const middle = written.at(-1)!;
  assert(middle > 1499.5 && middle < 2499.75);
  motion.animate(999.25, 100, 2);
  assert.equal(written.at(-1), middle, 'A quick reversal begins at the displayed frame.');
  assert.equal(frames.size, 1, 'Retargeting cancels the old scheduled frame.');
  tick(90);
  assert(written.at(-1)! < middle && written.at(-1)! > 999.25);
  tick(140);
  assert.equal(written.at(-1), 999.25);
  assert.equal(frames.size, 0);
  motion.animate(4000, 100, 2);
  motion.cancel();
  assert.equal(frames.size, 0, 'Unmount cleanup must cancel the current frame.');
  motion.set(10.99);
  assert.equal(written.at(-1), 10.99, 'Reduced motion uses an exact immediate target.');
  assert.equal(frames.size, 0);
});
