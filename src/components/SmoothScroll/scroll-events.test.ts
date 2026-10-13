import assert from 'node:assert/strict';
import test from 'node:test';

import { subscribeWindowScroll } from './scroll-events';

test('native scroll reads position once, shares it and releases the final listener', () => {
  const handlers = new Set<() => void>();
  let reads = 0;
  Reflect.defineProperty(globalThis, 'window', { configurable: true, value: {
    get scrollY() { reads++; return 320; },
    addEventListener: (_name: string, handler: () => void) => handlers.add(handler),
    removeEventListener: (_name: string, handler: () => void) => handlers.delete(handler),
  } });
  const values: number[] = [];
  const listener = (y: number) => values.push(y);
  const first = subscribeWindowScroll(listener);
  const second = subscribeWindowScroll(listener);
  try {
    assert.equal(handlers.size, 1);
    handlers.forEach((handler) => handler());
    assert.equal(reads, 1);
    assert.deepEqual(values, [320, 320]);
    first();
    handlers.forEach((handler) => handler());
    assert.equal(reads, 2);
    assert.deepEqual(values, [320, 320, 320]);
    second();
    assert.equal(handlers.size, 0);
  } finally {
    first();
    second();
    Reflect.deleteProperty(globalThis, 'window');
  }
});
