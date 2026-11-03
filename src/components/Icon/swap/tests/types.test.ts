import assert from 'node:assert/strict';
import test from 'node:test';

import { motionTimeCss, readMotionTimeMs } from '../../../../core/base/timing';
import { normalizeIconAnimate } from '../types';

test('normalizes modern icon changes, including zero-valued geometry', () => {
  assert.deepEqual(normalizeIconAnimate({ when: 'change', effect: 'swap', duration: 'fast', scale: 1, rotate: 0 }), {
    effect: 'swap', duration: 'fast', scale: 1, rotate: 0,
  });
  assert.deepEqual(normalizeIconAnimate({ when: 'change', effect: 'spin', duration: 0, scale: 0 }), {
    effect: 'spin', duration: 0, scale: 0,
  });
});

test('rejects string and tuple aliases', () => {
  for (const input of ['swap', ['spin'], ['spin', { duration: 0.24 }]]) assert.equal(normalizeIconAnimate(input), undefined);
});

test('named icon duration shares the local theme token between CSS and phase timing', () => {
  const config = normalizeIconAnimate({ when: 'change', effect: 'spin', duration: 'fast' });
  assert.equal(config?.duration, 'fast');
  const duration = config?.duration ?? 0;
  assert.equal(motionTimeCss(duration), 'var(--t-d-fast)');
  const scope = {
    ownerDocument: { defaultView: { getComputedStyle(node: Element) {
      assert.equal(node, scope);
      return { getPropertyValue: (name: string) => name === '--t-d-fast' ? '180ms' : '' };
    } } },
  } as unknown as Element;
  assert.equal(readMotionTimeMs(duration, scope, 0.3), 180);
});

test('ignores appearance, hover and unsupported change effects', () => {
  assert.equal(normalizeIconAnimate({ when: 'load', effect: 'swap' }), undefined);
  assert.equal(normalizeIconAnimate({ when: 'hover', effect: 'transform' }), undefined);
  assert.equal(normalizeIconAnimate({ when: 'change', effect: 'fade' }), undefined);
  assert.equal(normalizeIconAnimate(undefined), undefined);
});
