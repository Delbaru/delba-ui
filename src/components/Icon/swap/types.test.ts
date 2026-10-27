import assert from 'node:assert/strict';
import test from 'node:test';

import { motionTimeCss, readMotionTimeMs } from '../../../core/base/timing';
import { normalizeIconAnimate } from './types';

test('normalizes modern icon changes, including zero-valued geometry', () => {
  assert.deepEqual(normalizeIconAnimate({ when: 'change', effect: 'swap', duration: 'fast', scale: 1, rotate: 0 }), {
    effect: 'swap', duration: 'fast', scale: 1, rotate: 0,
  });
  assert.deepEqual(normalizeIconAnimate({ when: 'change', effect: 'spin', duration: 0, scale: 0 }), {
    effect: 'spin', duration: 0, scale: 0,
  });
});

test('preserves legacy string, singleton tuple and numeric-duration options', () => {
  assert.deepEqual(normalizeIconAnimate('swap'), { effect: 'swap' });
  assert.deepEqual(normalizeIconAnimate(['spin']), { effect: 'spin' });
  const config = normalizeIconAnimate(['spin', { duration: 0.24, scale: 0.5, rotate: 45 }]);
  assert.deepEqual(config, { effect: 'spin', duration: 0.24, scale: 0.5, rotate: 45 });
  assert.equal(motionTimeCss(config?.duration ?? 0), '0.24s');
  assert.equal(readMotionTimeMs(config?.duration ?? 0), 240);
});

test('named icon duration shares the local theme token between CSS and phase timing', () => {
  const config = normalizeIconAnimate({ when: 'change', effect: 'spin', duration: 'fast' });
  assert.equal(config?.duration, 'fast');
  const duration = config?.duration ?? 0;
  assert.equal(motionTimeCss(duration), 'var(--t-d-fast)');
  const scope = { nodeType: 1 } as Element;
  const original = globalThis.getComputedStyle;
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    value: (node: Element) => {
      assert.equal(node, scope);
      return { getPropertyValue: (name: string) => name === '--t-d-fast' ? '180ms' : '' };
    },
  });
  try {
    assert.equal(readMotionTimeMs(duration, scope, 0.3), 180);
  } finally {
    if (original) Object.defineProperty(globalThis, 'getComputedStyle', { configurable: true, value: original });
    else Reflect.deleteProperty(globalThis, 'getComputedStyle');
  }
});

test('ignores appearance, hover and unsupported change effects', () => {
  assert.equal(normalizeIconAnimate({ when: 'load', effect: 'swap' }), undefined);
  assert.equal(normalizeIconAnimate({ when: 'hover', effect: 'transform' }), undefined);
  assert.equal(normalizeIconAnimate({ when: 'change', effect: 'fade' }), undefined);
  assert.equal(normalizeIconAnimate(undefined), undefined);
});
