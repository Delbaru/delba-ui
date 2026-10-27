import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAnimation } from './resolveAnimation';
import type { TextAnimate } from './types';

test('counter object maps timing and trigger while legacy milliseconds remain unchanged', () => {
  const modern = { when: 'inView', effect: 'counter', duration: 'slow', start: 10, grouped: true } satisfies TextAnimate;
  const resolved = resolveAnimation(modern, '3 000');
  assert.equal(resolved.active, true);
  assert.deepEqual(resolved.options, {
    to: undefined, start: 10, suffix: undefined, grouped: true,
    trigger: 'onView', durationTime: 'slow',
  });

  const load = resolveAnimation({ when: 'load', effect: 'counter', to: 70, duration: 0.7 }, '70%');
  assert.equal(load.active, true);
  assert.deepEqual(load.options, {
    to: 70, start: undefined, suffix: undefined, grouped: undefined,
    trigger: 'onLoad', durationTime: 0.7,
  });

  const legacy = resolveAnimation(['counter', { to: 70, duration: 2500 }], '70%');
  assert.equal(legacy.options?.duration, 2500);
  assert.deepEqual(legacy.options, { to: 70, duration: 2500 });
});

test('textSlide change object selects swap, preserving older hover and sequence forms', () => {
  const modern = resolveAnimation({ when: 'change', effect: 'textSlide', duration: 'fast' }, '00:07');
  assert.equal(modern.active, true);
  assert.deepEqual(modern.options, { mode: 'swap', durationTime: 'fast' });
  assert.deepEqual(resolveAnimation({ when: 'change', effect: 'textSlide', by: 'text', duration: 'normal' }, 'Подвески').options,
    { mode: 'swap', durationTime: 'normal', by: 'text' });
  assert.equal(resolveAnimation('textSlide', 'Hover').active, true);
  assert.deepEqual(resolveAnimation(['textSlide', { mode: 'swap', duration: 0.4 }], '00:07').options, { mode: 'swap', duration: 0.4 });
});
