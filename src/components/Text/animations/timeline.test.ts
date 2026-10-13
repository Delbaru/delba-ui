import assert from 'node:assert/strict';
import test from 'node:test';
import { effectProgress, resolveTextTimeline, type TextTimelineAnimate } from './timeline';

const time = (value: string | number) => typeof value === 'number' ? value * 1000 : ({ slow: 700, normal: 400, counter: 2500 }[value] ?? 0);

test('simultaneous, halfway and completed starts share the appearance clock including delays', () => {
  for (const progress of [0, 0.5, 1]) {
    const timeline = resolveTextTimeline({ when: 'inView', delay: 0.2, effect: {
      up: { duration: 'slow', delay: 0.1 },
      counter: { to: 100, duration: 'normal', startAt: { effect: 'up', progress } },
    } }, time);
    assert.deepEqual(timeline.effects.up, { start: 300, duration: 700, end: 1000 });
    assert.equal(timeline.effects.counter?.start, 300 + 700 * progress);
    assert.equal(timeline.end, Math.max(1000, 700 + 700 * progress));
  }
  const simultaneous = resolveTextTimeline({ when: 'load', effect: { up: {}, counter: {} } }, time);
  assert.equal(simultaneous.effects.up?.start, simultaneous.effects.counter?.start);
  const optional = resolveTextTimeline({ when: 'load', effect: { up: undefined, counter: {} } }, time);
  assert.equal(optional.effects.up, undefined);
  assert.equal(optional.effects.counter?.start, 0);
});

test('dependency order is independent of object order and supports appearance after counting', () => {
  const timeline = resolveTextTimeline({ when: 'load', effect: {
    up: { duration: 0.3, startAt: { effect: 'counter', progress: 1 } },
    counter: { duration: 0.4 },
  } }, time);
  assert.equal(timeline.effects.up?.start, 400);
  assert.equal(timeline.end, 700);
});

test('invalid dependencies and conflicting appearance effects fail with actionable errors', () => {
  const invalid = (effect: unknown) => resolveTextTimeline({ when: 'load', effect } as TextTimelineAnimate, time);
  assert.throws(() => invalid({ counter: { startAt: { effect: 'up', progress: 1 } } }), /Unknown.*up/);
  assert.throws(() => invalid({ up: { startAt: { effect: 'counter', progress: 1 } }, counter: { startAt: { effect: 'up', progress: 1 } } }), /Cyclic/);
  for (const progress of [-1, 1.1, NaN]) assert.throws(() => invalid({ up: {}, counter: { startAt: { effect: 'up', progress } } }), /between 0 and 1/);
  assert.throws(() => invalid({ up: {}, scale: {} }), /one appearance/);
});

test('progress handles zero duration, waiting and the final value', () => {
  assert.equal(effectProgress({ start: 200, duration: 0, end: 200 }, 199), 0);
  assert.equal(effectProgress({ start: 200, duration: 0, end: 200 }, 200), 1);
  assert.equal(effectProgress({ start: 200, duration: 400, end: 600 }, 400), 0.5);
  assert.equal(effectProgress({ start: 200, duration: 400, end: 600 }, 900), 1);
});
