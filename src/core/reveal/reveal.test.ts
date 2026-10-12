import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { compile } from 'sass';

import {
  resolveReveal,
  revealAttrs,
  revealDelays,
  revealObserverKey,
  revealSignature,
  revealStyle,
  isAppearanceAnimate,
  isInViewAnimate,
  isOpenAnimate,
  resolveRevealInput,
  isRevealCascadeChild,
  withoutStagger,
  type RevealInput,
  type RevealOptions,
  type InViewAnimate,
  type AppearanceAnimate,
} from './reveal';

test('resolveReveal: ключ — умолчания, опции — в мс', () => {
  assert.deepEqual(resolveReveal('up'), {
    key: 'up', stagger: 0, delay: 0, duration: null, distance: null, once: true, threshold: 0, rootMargin: '0px', fade: true, start: 'view',
  });
  assert.deepEqual(resolveReveal(['fade', { stagger: 0.08, delay: 0.1, duration: 0.6, distance: -48, once: false, threshold: 2, rootMargin: '0px 0px -10% 0px' }]), {
    key: 'fade', stagger: 80, delay: 100, duration: 600, distance: 48, once: false, threshold: 1, rootMargin: '0px 0px -10% 0px', fade: true, start: 'view',
  });
  const load = resolveReveal(['up', { fade: false, start: 'load' }]);
  assert.equal(load?.fade, false);
  assert.equal(load?.start, 'load');
  // Чужое значение `start` из JS без типов — обычный ход по экрану, а не вечное ожидание.
  assert.equal(resolveReveal(['up', { start: 'now' as 'load' }])?.start, 'view');
  assert.equal(resolveReveal(['scale'])?.key, 'scale');
});

test('resolveReveal: object API normalizes effect and preserves option semantics', () => {
  const input = { effect: 'up', delay: 0.16, stagger: 0.08, duration: 0.6, fade: false, start: 'load' } satisfies RevealInput;
  assert.deepEqual(resolveReveal(input), {
    key: 'up', stagger: 80, delay: 160, duration: 600, distance: null, once: true, threshold: 0,
    rootMargin: '0px', fade: false, start: 'load',
  });
  assert.equal(resolveReveal({ effect: 'scale' })?.key, 'scale');
  const imageInput = { effect: 'blur', delay: 0.1 } satisfies RevealInput<Omit<RevealOptions, 'stagger'>>;
  assert.equal(resolveReveal(imageInput)?.key, 'blur');
});

test('inView animate shares reveal normalization and wins over the legacy reveal prop', () => {
  const animate = { when: 'inView', effect: 'up', delay: 0.16, stagger: 0.08 } satisfies InViewAnimate;
  // @ts-expect-error inView starts on intersection; load-only CSS is reserved for the legacy reveal prop.
  const loadAnimate: InViewAnimate = { when: 'inView', effect: 'up', start: 'load' };
  void loadAnimate;
  // @ts-expect-error AppearanceAnimate selects its start with `when`, not a second `start` option.
  const conflictingStart: AppearanceAnimate = { when: 'load', effect: 'fade', start: 'view' };
  void conflictingStart;
  assert.equal(isInViewAnimate(animate), true);
  assert.equal(isAppearanceAnimate(animate), true);
  assert.equal(isAppearanceAnimate({ when: 'load', effect: 'fade' }), true);
  assert.equal(isOpenAnimate({ when: 'open', effect: 'down' }), true);
  assert.equal(isAppearanceAnimate({ when: 'open', effect: 'down' }), false);
  assert.equal(isInViewAnimate({ when: 'mount', effect: 'up' }), false);
  assert.equal(isInViewAnimate({ when: 'load', effect: 'fade' }), false);
  assert.equal(isInViewAnimate({ when: 'inView', effect: 'spin' }), false);
  assert.equal(isInViewAnimate('fadeIn'), false);

  const chosen = resolveRevealInput(animate, ['fade', { delay: 0.4 }]);
  assert.deepEqual(chosen, { ...animate, start: 'view' });
  assert.deepEqual(resolveReveal(chosen), {
    key: 'up', stagger: 80, delay: 160, duration: null, distance: null, once: true,
    threshold: 0, rootMargin: '0px', fade: true, start: 'view',
  });
  assert.deepEqual(resolveReveal(resolveRevealInput('fadeIn', ['left', { delay: 0.1 }])), resolveReveal(['left', { delay: 0.1 }]));
  assert.deepEqual(resolveReveal(resolveRevealInput(undefined, 'scale')), resolveReveal('scale'));
  assert.equal(resolveReveal(resolveRevealInput({ when: 'inView', effect: 'fade', start: 'load' } as unknown, ['up', { start: 'load' }]))?.start, 'view');
  assert.equal(resolveReveal(resolveRevealInput({ when: 'load', effect: 'fade' } satisfies AppearanceAnimate, ['up']))?.start, 'load');
  assert.equal(resolveReveal(resolveRevealInput(undefined, { effect: 'up', start: 'load' }))?.start, 'load');
});

test('resolveReveal: нет пропа, чужой ключ, мусор в числах', () => {
  assert.equal(resolveReveal(undefined), null);
  assert.equal(resolveReveal(null), null);
  // Чужой ключ приходит из JS без типов — узел остаётся видимым, а не прячется навсегда.
  assert.equal(resolveReveal('spin' as 'up'), null);
  const r = resolveReveal(['up', { stagger: -1, delay: Number.NaN, duration: 0 }]);
  assert.equal(r?.stagger, 0);
  assert.equal(r?.delay, 0);
  assert.equal(r?.duration, null);
});

test('revealAttrs: каскад помечается отдельным атрибутом', () => {
  assert.deepEqual(revealAttrs(resolveReveal('blur')), { 'data-reveal': 'blur' });
  assert.deepEqual(revealAttrs(resolveReveal(['up', { stagger: 0.05 }])), { 'data-reveal': 'up', 'data-reveal-stagger': '' });
  assert.equal(revealAttrs(null), undefined);
  assert.deepEqual(revealAttrs(resolveReveal(['up', { stagger: 0.1, start: 'load' }])), {
    'data-reveal': 'up', 'data-reveal-stagger': '', 'data-reveal-start': 'load',
  });
});

test('cascade eligibility skips marked nodes and nodes with their own reveal', () => {
  const attrs = (values: Record<string, string | null>) => ({ getAttribute: (name: string) => values[name] ?? null });
  assert.equal(isRevealCascadeChild(attrs({})), true);
  assert.equal(isRevealCascadeChild(attrs({ 'data-reveal-skip': '' })), false);
  assert.equal(isRevealCascadeChild(attrs({ 'data-reveal': 'up' })), false);
  assert.equal(isRevealCascadeChild(attrs({ 'data-reveal-state': 'wait' })), false);
  // Чужое значение не объявляет собственного reveal и остаётся участником каскада.
  assert.equal(isRevealCascadeChild(attrs({ 'data-reveal': 'project-note' })), true);
});

test('revealStyle: только заданное — остальное берёт тема', () => {
  assert.deepEqual(revealStyle(resolveReveal('up')), {});
  assert.deepEqual(revealStyle(resolveReveal(['left', { duration: 0.4, delay: 0.2, distance: 64 }])), {
    '--reveal-duration': '400ms', '--reveal-delay': '200ms', '--reveal-distance': 'calc(var(--rpx) * 64)',
  });
  assert.deepEqual(revealStyle(resolveReveal(['up', { fade: false }])), { '--reveal-o': '1' });
  // Шаг каскада нужен CSS только при старте с загрузки: по экрану задержки ставит наблюдатель.
  assert.deepEqual(revealStyle(resolveReveal(['up', { stagger: 0.08 }])), {});
  assert.deepEqual(revealStyle(resolveReveal(['up', { stagger: 0.08, start: 'load' }])), { '--reveal-step': '80ms' });
});

test('down enters from above and distances keep rpx, percent and named token semantics', () => {
  const down = resolveReveal({ effect: 'down', distance: 'full' });
  assert.equal(down?.key, 'down');
  assert.deepEqual(revealAttrs(down), { 'data-reveal': 'down' });
  assert.deepEqual(revealStyle(down), { '--reveal-distance': 'var(--t-m-distance-full, calc(var(--rpx) * 32))' });
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'down', distance: '100%' })), { '--reveal-distance': '100%' });
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'down', distance: 24 })), { '--reveal-distance': 'calc(var(--rpx) * 24)' });
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'down', distance: 'small' })), { '--reveal-distance': 'var(--t-m-distance-small, calc(var(--rpx) * 32))' });
  assert.equal(resolveReveal({ effect: 'down', distance: 'calc(100vh)' })?.distance, null);
  assert.equal(resolveReveal({ effect: 'down', distance: '-100%' })?.distance, null);
});

test('compiled reveal CSS starts down above, reverses on close and removes motion on request', () => {
  const css = compile(path.join(import.meta.dirname, '_reveal.scss')).css;
  assert.match(css, /\[data-reveal=down\] \{\s*--reveal-t: 0 calc\(var\(--reveal-shift\) \* -1\);/);
  assert.match(css, /\[data-reveal-state=out\] \{\s*animation: ui-reveal-out [^;]+ reverse both;/);
  assert.match(css, /@media screen and \(scripting: enabled\) and \(prefers-reduced-motion: reduce\) \{[\s\S]*\[data-reveal-state\] \{\s*animation: none;/);
});

test('load cascade index counts only eligible children', () => {
  const css = compile(path.join(import.meta.dirname, '_reveal.scss')).css;
  const firstIndex = css.split('\n').find((line) => line.includes(':nth-child(1 of'));
  assert.ok(firstIndex);
  assert.match(firstIndex, /\[data-reveal-skip\]/);
  assert.match(firstIndex, /\[data-reveal-state\]/);
  assert.match(firstIndex, /\[data-reveal=fade\]/);
});

test('revealDelays: delay + порядок × stagger', () => {
  assert.deepEqual(revealDelays(4, { delay: 100, stagger: 80 }), [100, 180, 260, 340]);
  assert.deepEqual(revealDelays(1, { delay: 0, stagger: 80 }), [0]);
  assert.deepEqual(revealDelays(0, { delay: 0, stagger: 80 }), []);
});

test('ключ наблюдателя и подпись опций', () => {
  const a = resolveReveal(['up', { stagger: 0.08 }]);
  const b = resolveReveal(['up', { stagger: 0.08 }]);
  assert.ok(a && b);
  assert.equal(revealSignature(a), revealSignature(b));
  assert.equal(revealObserverKey(a), revealObserverKey(resolveReveal('fade') ?? a));
  assert.notEqual(revealObserverKey(a), revealObserverKey(resolveReveal(['up', { rootMargin: '-10%' }]) ?? a));
  assert.notEqual(revealSignature(a), revealSignature(resolveReveal(['up', { stagger: 0.08, start: 'load' }])));
  assert.equal(revealSignature(null), '');
});

test('withoutStagger: снимает каскад, остальное не трогает', () => {
  assert.deepEqual(withoutStagger(['up', { stagger: 0.1, delay: 0.2 }]), ['up', { stagger: 0, delay: 0.2 }]);
  assert.deepEqual(withoutStagger({ effect: 'up', stagger: 0.1, delay: 0.2 }), { effect: 'up', stagger: 0, delay: 0.2 });
  assert.deepEqual(withoutStagger({ effect: 'up', delay: 0.2 }), { effect: 'up', delay: 0.2 });
  assert.deepEqual(withoutStagger(['fade', { delay: 0.2 }]), ['fade', { delay: 0.2 }]);
  assert.equal(withoutStagger('fade'), 'fade');
  assert.equal(withoutStagger(undefined), undefined);
});

test('named motion timing stays theme-driven in SSR CSS and stagger calculations', () => {
  const config = resolveReveal({ effect: 'up', duration: 'slow', delay: 'fast', stagger: 'veryFast', start: 'load' });
  assert.ok(config);
  assert.deepEqual(revealStyle(config), {
    '--reveal-duration': 'var(--t-d-slow)',
    '--reveal-delay': 'var(--t-d-fast)',
    '--reveal-step': 'var(--t-d-very-fast)',
  });
  assert.deepEqual(revealAttrs(config), { 'data-reveal': 'up', 'data-reveal-stagger': '', 'data-reveal-start': 'load' });
  assert.deepEqual(revealDelays(3, config), [
    'calc(var(--t-d-fast) + 0 * var(--t-d-very-fast))',
    'calc(var(--t-d-fast) + 1 * var(--t-d-very-fast))',
    'calc(var(--t-d-fast) + 2 * var(--t-d-very-fast))',
  ]);
  assert.deepEqual(revealDelays(2, { delay: 100, stagger: 'verySlow' }), [
    'calc(100ms + 0 * var(--t-d-very-slow))',
    'calc(100ms + 1 * var(--t-d-very-slow))',
  ]);
  assert.equal(resolveReveal({ effect: 'up', delay: 'slow-motion' })?.delay, 0);
});
