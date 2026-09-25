import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveReveal, revealAttrs, revealDelays, revealObserverKey, revealSignature, revealStyle, withoutStagger } from './reveal';

test('resolveReveal: ключ — умолчания, опции — в мс', () => {
  assert.deepEqual(resolveReveal('up'), {
    key: 'up', stagger: 0, delay: 0, duration: null, distance: null, once: true, threshold: 0, rootMargin: '0px',
  });
  assert.deepEqual(resolveReveal(['fade', { stagger: 0.08, delay: 0.1, duration: 0.6, distance: -48, once: false, threshold: 2, rootMargin: '0px 0px -10% 0px' }]), {
    key: 'fade', stagger: 80, delay: 100, duration: 600, distance: 48, once: false, threshold: 1, rootMargin: '0px 0px -10% 0px',
  });
  assert.equal(resolveReveal(['scale'])?.key, 'scale');
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
});

test('revealStyle: только заданное — остальное берёт тема', () => {
  assert.deepEqual(revealStyle(resolveReveal('up')), {});
  assert.deepEqual(revealStyle(resolveReveal(['left', { duration: 0.4, delay: 0.2, distance: 64 }])), {
    '--reveal-duration': '400ms', '--reveal-delay': '200ms', '--reveal-distance': '64',
  });
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
  assert.equal(revealSignature(null), '');
});

test('withoutStagger: снимает каскад, остальное не трогает', () => {
  assert.deepEqual(withoutStagger(['up', { stagger: 0.1, delay: 0.2 }]), ['up', { stagger: 0, delay: 0.2 }]);
  assert.equal(withoutStagger('fade'), 'fade');
  assert.equal(withoutStagger(undefined), undefined);
});
