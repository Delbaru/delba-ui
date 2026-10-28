import assert from 'node:assert/strict';
import test from 'node:test';

import { flushWindowScroll, subscribeWindowScroll } from './scroll-events';

test('native scroll batches position reads, flushes before engine writes and cancels on final release', () => {
  const handlers = new Set<() => void>();
  const frames = new Map<number, FrameRequestCallback>();
  const originals = new Map(['window', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let nextFrame = 0;
  let reads = 0;
  Reflect.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  } });
  Reflect.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: (id: number) => frames.delete(id) });
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
    for (let i = 0; i < 3; i++) handlers.forEach((handler) => handler());
    assert.equal(reads, 0);
    assert.equal(frames.size, 1);
    frames.values().next().value?.(0);
    assert.equal(reads, 1);
    assert.deepEqual(values, [320, 320]);
    first();
    handlers.forEach((handler) => handler());
    flushWindowScroll();
    flushWindowScroll();
    assert.equal(frames.size, 0);
    assert.equal(reads, 2);
    assert.deepEqual(values, [320, 320, 320]);
    handlers.forEach((handler) => handler());
    second();
    assert.equal(handlers.size, 0);
    assert.equal(frames.size, 0);
    flushWindowScroll();
    assert.equal(reads, 2);
  } finally {
    first();
    second();
    for (const [key, descriptor] of originals) {
      if (descriptor) Reflect.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
