import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAnimation } from '../resolveAnimation';
import type { TextAnimate } from '../types';

test('counter intent preserves seconds and named timing', () => {
  const modern = {
    when: 'inView',
    effect: 'counter',
    duration: 'slow',
    start: 10,
    grouped: true,
  } satisfies TextAnimate;
  const resolved = resolveAnimation(modern, '3 000');
  assert.equal(resolved.active, true);
  assert.deepEqual(resolved.options, {
    to: undefined,
    start: 10,
    suffix: undefined,
    grouped: true,
    trigger: 'onView',
    duration: 'slow',
  });

  const load = resolveAnimation({ when: 'load', effect: 'counter', to: 70, duration: 0.7 }, '70%');
  assert.equal(load.active, true);
  assert.deepEqual(load.options, {
    to: 70,
    start: undefined,
    suffix: undefined,
    grouped: undefined,
    trigger: 'onLoad',
    duration: 0.7,
  });


});

test('textSlide change intent selects the existing swap renderer', () => {
  const modern = resolveAnimation(
    { when: 'change', effect: 'textSlide', duration: 'fast' },
    '00:07',
  );
  assert.equal(modern.active, true);
  assert.deepEqual(modern.options, { mode: 'swap', duration: 'fast' });
  assert.deepEqual(
    resolveAnimation(
      { when: 'change', effect: 'textSlide', by: 'text', duration: 'normal' },
      'Подвески',
    ).options,
    { mode: 'swap', duration: 'normal', by: 'text' },
  );

});

test('object step sequences reach the same renderer options without legacy tuples', () => {
  for (const effect of ['textSlide', 'textClip'] as const) {
    const resolved = resolveAnimation(
      { when: 'change', effect, steps: ['First', 'Second'], currentStep: 1, duration: 'fast' },
      'First',
    );
    assert.equal(resolved.active, true);
    assert.deepEqual(resolved.options, {
      steps: ['First', 'Second'],
      currentStep: 1,
      duration: 'fast',
      clipHeight: undefined,
    });
  }
});

test('modern hover and reveal use their existing renderer contracts', () => {
  const hover = resolveAnimation({ when: 'hover', effect: 'textSlide', duration: 'fast', hoverColor: 'var(--primary)' }, 'Read');
  assert.deepEqual(hover.options, { duration: 'fast', hoverColor: 'var(--primary)' });
  const reveal = resolveAnimation({ when: 'change', effect: 'textReveal', duration: 'fast', stagger: 'step', shift: 0.2 }, 'Updated');
  assert.equal(reveal.active, true);
  assert.deepEqual(reveal.options, { duration: 'fast', stagger: 'step', shift: 0.2 });
});
