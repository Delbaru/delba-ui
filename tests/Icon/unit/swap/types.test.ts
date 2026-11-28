import assert from 'node:assert/strict';
import test from 'node:test';

import { motionTimeCss, readMotionTimeMs } from '../../../../src/core/base/timing';
import { resolveIconChange } from '../../../../src/components/Icon/swap/types';

test('normalizes modern icon changes, including zero-valued geometry', () => {
  assert.deepEqual(resolveIconChange({ effect: 'swap', duration: 'fast', scale: 1, rotate: 0 }), {
    effect: 'swap', duration: 'fast', scale: 1, rotate: 0,
  });
  assert.deepEqual(resolveIconChange({ effect: 'spin', duration: 0, scale: 0 }), {
    effect: 'spin', duration: 0, scale: 0,
  });
});

test('rejects legacy change forms', () => {
  for (const input of ['swap', ['spin'], { when: 'change', effect: 'spin' }]) {
    assert.equal(resolveIconChange(input), undefined);
  }
});

test('named icon duration shares the local theme token between CSS and phase timing', () => {
  const config = resolveIconChange({ effect: 'spin', duration: 'fast' });
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
  assert.equal(resolveIconChange({ when: 'load', effect: 'up' }), undefined);
  assert.equal(resolveIconChange({ effect: 'transform' }), undefined);
  assert.equal(resolveIconChange({ effect: 'fade' }), undefined);
  assert.equal(resolveIconChange(undefined), undefined);
});
