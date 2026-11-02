import assert from 'node:assert/strict';
import test from 'node:test';

import { motionTimeCss, readMotionTimeMs } from '../timing';

test('motionTimeCss uses seconds or a named CSS token', () => {
  assert.equal(motionTimeCss(0.4), '0.4s');
  assert.equal(motionTimeCss('veryFast'), 'var(--t-d-very-fast)');
  assert.equal(motionTimeCss('bad-token'), '0s');
});

test('readMotionTimeMs resolves inherited named duration in the supplied node document', () => {
  let received: Element | undefined;
  const scope = {
    ownerDocument: {
      defaultView: {
        getComputedStyle(node: Element) {
          received = node;
          return { getPropertyValue: (name: string) => name === '--t-d-very-fast' ? '0.16s' : name === '--t-d-fast' ? '240ms' : '' };
        },
      },
    },
  } as unknown as Element;
  assert.equal(readMotionTimeMs('veryFast', scope, 0.7), 160);
  assert.equal(received, scope);
  assert.equal(readMotionTimeMs('fast', { documentElement: scope } as Document), 240);
  assert.equal(received, scope);
  assert.equal(readMotionTimeMs('missing', scope, 0.7), 700);
  assert.equal(readMotionTimeMs(0.24, scope), 240);
  assert.equal(readMotionTimeMs('bad-token', scope, 0.7), 700);
});
