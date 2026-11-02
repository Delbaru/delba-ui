import assert from 'node:assert/strict';
import test from 'node:test';
import { prefersReducedMotion, readMotionMs } from '../motion';

test('motion duration reads computed style from the node owner document', () => {
  const node = {
    ownerDocument: {
      defaultView: {
        getComputedStyle(target: HTMLElement) {
          assert.equal(target, node);
          return { transitionDuration: '0.2s', transitionDelay: '50ms', animationDuration: '0.4s', animationDelay: '0s' };
        },
      },
    },
  } as unknown as HTMLElement;
  assert.equal(readMotionMs(node), 250);
  assert.equal(readMotionMs(node, 'animation'), 400);
});

test('motion preference can come from the target window', () => {
  const view = { matchMedia: () => ({ matches: true }) } as unknown as Window;
  assert.equal(prefersReducedMotion(view), true);
  assert.equal(prefersReducedMotion(null), false);
});

test('motion duration has no browser dependency for a detached document', () => {
  const node = { ownerDocument: { defaultView: null } } as unknown as HTMLElement;
  assert.equal(readMotionMs(node), 0);
});
