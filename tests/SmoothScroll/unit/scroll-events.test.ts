import assert from 'node:assert/strict';
import test from 'node:test';

import { getScrollEvents, subscribeWindowScroll } from '../../../src/core/Scroll/Smooth/scroll-events';
import type { ScrollView } from '../../../src/core/Scroll/Smooth/viewport';

test('native scroll batches per viewport and cancels after the final subscriber', () => {
  const windowEvents = new EventTarget();
  const selfEvents = new EventTarget();
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let reads = 0;
  const view = Object.assign(windowEvents, {
    requestAnimationFrame(callback: FrameRequestCallback) {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame(id: number) { frames.delete(id); },
  }) as unknown as ScrollView;
  Object.defineProperty(view, 'scrollY', { get() { reads++; return 320; } });
  const host = Object.assign(selfEvents, { scrollTop: 75 }) as unknown as HTMLElement;

  const windowScroll = getScrollEvents(view);
  const selfScroll = getScrollEvents(view, host);
  const values: number[] = [];
  const listener = (y: number) => values.push(y);
  const first = subscribeWindowScroll(listener, view);
  const second = subscribeWindowScroll(listener, view);
  const releaseSelf = selfScroll.subscribe(listener);
  for (let i = 0; i < 3; i++) view.dispatchEvent(new Event('scroll'));
  host.dispatchEvent(new Event('scroll'));
  assert.equal(reads, 0);
  assert.equal(frames.size, 2);

  selfScroll.flush();
  assert.equal(frames.size, 1);
  assert.deepEqual(values, [75]);
  assert.equal(reads, 0);
  windowScroll.flush();
  assert.equal(reads, 1);
  assert.deepEqual(values, [75, 320, 320]);

  first();
  view.dispatchEvent(new Event('scroll'));
  windowScroll.flush();
  windowScroll.flush();
  assert.equal(frames.size, 0);
  assert.equal(reads, 2);
  assert.deepEqual(values, [75, 320, 320, 320]);

  view.dispatchEvent(new Event('scroll'));
  host.dispatchEvent(new Event('scroll'));
  second();
  releaseSelf();
  assert.equal(frames.size, 0);
  view.dispatchEvent(new Event('scroll'));
  host.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 0);
});
