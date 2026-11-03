import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { compile } from 'sass';
import { motionInView } from '../../base/motion-config';

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
  resolveAppearanceAnimate,
  isRevealCascadeChild,
  withoutStagger,
  type RevealConfig,
  type InViewAnimate,
  type AppearanceAnimate,
} from '../reveal';

test('resolveReveal: ключ — умолчания, опции — в мс', () => {
  assert.deepEqual(resolveReveal({ effect: 'up' }), {
    key: 'up', stagger: 0, delay: 0, duration: null, distance: null, once: true, threshold: motionInView.threshold, rootMargin: motionInView.rootMargin, fade: true, start: 'view',
  });
  assert.deepEqual(resolveReveal({ effect: 'fade', stagger: 0.08, delay: 0.1, duration: 0.6, distance: -48, once: false, threshold: 2, rootMargin: '0px 0px -10% 0px' }), {
    key: 'fade', stagger: 80, delay: 100, duration: 600, distance: 48, once: false, threshold: 1, rootMargin: '0px 0px -10% 0px', fade: true, start: 'view',
  });
  const load = resolveReveal({ effect: 'up', fade: false, start: 'load' });
  assert.equal(load?.fade, false);
  assert.equal(load?.start, 'load');
  // Чужое значение `start` из JS без типов — обычный ход по экрану, а не вечное ожидание.
  assert.equal(resolveReveal({ effect: 'up', start: 'now' as 'load' })?.start, 'view');
  assert.equal(resolveReveal({ effect: 'scale' })?.key, 'scale');
});

test('horizontal expansion is an appearance effect and keeps an observable starting extent', () => {
  const reveal = resolveReveal({ effect: 'expandX', fade: false });
  assert.equal(reveal?.key, 'expandX');
  assert.deepEqual(revealAttrs(reveal), { 'data-reveal': 'expandX' });
  const css = compile(path.join(import.meta.dirname, '../_reveal.scss')).css;
  assert.match(css, /data-reveal=expandX/);
  assert.match(css, /--reveal-s: 0\.001 1/);
  assert.match(css, /transform-origin: left center/);
});

test('resolveReveal: object API normalizes effect and preserves option semantics', () => {
  const input = { effect: 'up', delay: 0.16, stagger: 0.08, duration: 0.6, fade: false, start: 'load' } satisfies RevealConfig;
  assert.deepEqual(resolveReveal(input), {
    key: 'up', stagger: 80, delay: 160, duration: 600, distance: null, once: true, threshold: motionInView.threshold,
    rootMargin: motionInView.rootMargin, fade: false, start: 'load',
  });
  assert.equal(resolveReveal({ effect: 'scale' })?.key, 'scale');
  const imageInput = { effect: 'blur', delay: 0.1 } satisfies RevealConfig;
  assert.equal(resolveReveal(imageInput)?.key, 'blur');
});

test('appearance intent selects its trigger without a parallel reveal door', () => {
  const animate = { when: 'inView', effect: 'up', delay: 0.16, stagger: 0.08 } satisfies InViewAnimate;
  assert.equal(isInViewAnimate(animate), true);
  assert.equal(isAppearanceAnimate(animate), true);
  assert.equal(isOpenAnimate({ when: 'open', effect: 'down' }), true);
  assert.equal(isAppearanceAnimate({ when: 'open', effect: 'down' }), false);
  assert.equal(isAppearanceAnimate('up'), false);
  assert.equal(isAppearanceAnimate(['up']), false);
  assert.deepEqual(resolveAppearanceAnimate(animate), { ...animate, start: 'view' });
  assert.equal(resolveAppearanceAnimate(undefined), undefined);
  assert.equal(resolveAppearanceAnimate('fadeIn'), undefined);
  assert.equal(resolveReveal(resolveAppearanceAnimate({ when: 'load', effect: 'fade' } satisfies AppearanceAnimate))?.start, 'load');
  // The event is authoritative even for untyped JavaScript passing an extra start.
  assert.equal(resolveReveal(resolveAppearanceAnimate({ when: 'inView', effect: 'fade', start: 'load' }))?.start, 'view');
});

test('resolveReveal: нет пропа, чужой ключ, мусор в числах', () => {
  assert.equal(resolveReveal(undefined), null);
  assert.equal(resolveReveal(null), null);
  // Чужой ключ приходит из JS без типов — узел остаётся видимым, а не прячется навсегда.
  assert.equal(resolveReveal({ effect: 'spin' as 'up' }), null);
  const r = resolveReveal({ effect: 'up', stagger: -1, delay: Number.NaN, duration: 0 });
  assert.equal(r?.stagger, 0);
  assert.equal(r?.delay, 0);
  assert.equal(r?.duration, 0);
  assert.equal(revealStyle(r)?.['--reveal-duration'], '0ms');
});

test('revealAttrs: каскад помечается отдельным атрибутом', () => {
  assert.deepEqual(revealAttrs(resolveReveal({ effect: 'blur' })), { 'data-reveal': 'blur' });
  assert.deepEqual(revealAttrs(resolveReveal({ effect: 'up', stagger: 0.05 })), { 'data-reveal': 'up', 'data-reveal-stagger': '' });
  assert.equal(revealAttrs(null), undefined);
  assert.deepEqual(revealAttrs(resolveReveal({ effect: 'up', stagger: 0.1, start: 'load' })), {
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
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'up' })), {});
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'left', duration: 0.4, delay: 0.2, distance: 64 })), {
    '--reveal-duration': '400ms', '--reveal-delay': '200ms', '--reveal-distance': 'calc(var(--rpx) * 64)',
  });
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'up', fade: false })), { '--reveal-o': '1' });
  // Шаг каскада нужен CSS только при старте с загрузки: по экрану задержки ставит наблюдатель.
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'up', stagger: 0.08 })), {});
  assert.deepEqual(revealStyle(resolveReveal({ effect: 'up', stagger: 0.08, start: 'load' })), { '--reveal-step': '80ms' });
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
  const css = compile(path.join(import.meta.dirname, '../_reveal.scss')).css;
  assert.match(css, /\[data-reveal=down\] \{\s*--reveal-t: 0 calc\(var\(--reveal-shift\) \* -1\);/);
  assert.match(css, /\[data-reveal-state=out\] \{\s*animation: ui-reveal-out [^;]+ reverse both;/);
  assert.match(css, /@media screen and \(scripting: enabled\) and \(prefers-reduced-motion: reduce\) \{[\s\S]*\[data-reveal-state\] \{\s*animation: none;/);
});

test('load cascade index counts only eligible children', () => {
  const css = compile(path.join(import.meta.dirname, '../_reveal.scss')).css;
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
  const a = resolveReveal({ effect: 'up', stagger: 0.08 });
  const b = resolveReveal({ effect: 'up', stagger: 0.08 });
  assert.ok(a && b);
  assert.equal(revealSignature(a), revealSignature(b));
  assert.equal(revealObserverKey(a), revealObserverKey(resolveReveal({ effect: 'fade' }) ?? a));
  assert.notEqual(revealObserverKey(a), revealObserverKey(resolveReveal({ effect: 'up', rootMargin: '-10%' }) ?? a));
  assert.notEqual(revealSignature(a), revealSignature(resolveReveal({ effect: 'up', stagger: 0.08, start: 'load' })));
  assert.equal(revealSignature(null), '');
});

test('withoutStagger: снимает каскад, остальное не трогает', () => {
  assert.deepEqual(withoutStagger({ effect: 'up', stagger: 0.1, delay: 0.2 }), { effect: 'up', stagger: 0, delay: 0.2 });
  assert.deepEqual(withoutStagger({ effect: 'up', delay: 0.2 }), { effect: 'up', delay: 0.2 });
  assert.deepEqual(withoutStagger({ effect: 'fade', delay: 0.2 }), { effect: 'fade', delay: 0.2 });
  assert.deepEqual(withoutStagger({ effect: 'fade' }), { effect: 'fade' });
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
