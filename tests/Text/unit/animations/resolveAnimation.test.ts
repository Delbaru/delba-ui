import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAnimation } from '../../../../src/components/Text/animations/resolveAnimation';
import type { TextAnimate } from '../../../../src/components/Text/animations/types';

test('counter intent preserves seconds and named timing', () => {
  const animation = {
    appearance: { when: 'inView', effect: 'counter', duration: 'slow', start: 10, grouped: true },
    hover: { effect: 'rise' },
  } satisfies TextAnimate;
  const resolved = resolveAnimation(animation, '3 000');
  assert.equal(resolved.active, true);
  assert.deepEqual(resolved.options, {
    to: undefined,
    start: 10,
    suffix: undefined,
    grouped: true,
    trigger: 'onView',
    duration: 'slow',
  });

  const load = resolveAnimation({ appearance: { when: 'load', effect: 'counter', to: 70, duration: 0.7 } }, '70%');
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

test('counter change intent delegates to the retargeting counter owner', () => {
  const resolved = resolveAnimation({ change: { effect: 'counter', duration: 'fast' } }, '1 499,50 ₽');
  assert.equal(resolved.active, true);
  assert.equal(resolved.options && 'trigger' in resolved.options ? resolved.options.trigger : undefined, 'onChange');
  assert.equal(resolveAnimation({ change: { effect: 'counter' } }, 'Цена по запросу').active, false);
});

test('textSlide change intent selects the existing swap renderer', () => {
  const slide = resolveAnimation(
    { change: { effect: 'textSlide', duration: 'fast' } },
    '00:07',
  );
  assert.equal(slide.active, true);
  assert.deepEqual(slide.options, { mode: 'swap', duration: 'fast' });
  assert.deepEqual(
    resolveAnimation(
      { change: { effect: 'textSlide', by: 'text', duration: 'normal' } },
      'Подвески',
    ).options,
    { mode: 'swap', duration: 'normal', by: 'text' },
  );
});

test('change step sequences pass selection and timing to the renderer', () => {
  for (const effect of ['textSlide', 'textClip'] as const) {
    const resolved = resolveAnimation(
      { change: { effect, steps: ['First', 'Second'], currentStep: 1, duration: 'fast' } },
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

test('text hover works alongside host appearance', () => {
  const hover = resolveAnimation({
    appearance: { when: 'inView', effect: 'fade' },
    hover: { effect: 'textSlide', duration: 'fast', hoverColor: 'var(--primary)' },
  }, 'Read');
  assert.deepEqual(hover.options, { duration: 'fast', hoverColor: 'var(--primary)' });
});

test('text reveal receives change timing and character options', () => {
  const reveal = resolveAnimation({
    change: { effect: 'textReveal', duration: 'fast', stagger: 'step', shift: 0.2 },
  }, 'Updated');
  assert.equal(reveal.active, true);
  assert.deepEqual(reveal.options, { duration: 'fast', stagger: 'step', shift: 0.2 });
});
