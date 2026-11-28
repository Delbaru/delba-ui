import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileString } from 'sass';

import { resolveSurfaceMotion } from '../../../src/core/Motion/SurfaceMotion';
import type { SurfaceAnimate } from '../../../src/core/Motion/SurfaceMotion.types';

test('surface motion opts in through named channels', () => {
  for (const animate of [
    undefined,
    { hover: false, idle: false },
    { when: 'hover', effect: 'rise' },
    { when: 'idle', effect: 'glow' },
  ]) {
    assert.deepEqual(resolveSurfaceMotion(animate as SurfaceAnimate | undefined), {
      appearance: undefined,
      hover: undefined,
      attributes: undefined,
      style: undefined,
      effects: { glow: false },
    });
  }
});

test('appearance, rise, glow and keyed content can be configured together', () => {
  const animate = {
    appearance: { when: 'load', effect: 'up' },
    hover: { effect: 'rise', fill: 'var(--hover-gradient)', duration: 'normal' },
    idle: { effect: 'glow', color: 'var(--primary)', colorTo: 'var(--secondary)', strength: 1.2, duration: 6 },
    change: { effect: 'fade', key: 0 },
  } satisfies SurfaceAnimate;

  assert.deepEqual(resolveSurfaceMotion(animate), {
    appearance: animate.appearance,
    hover: undefined,
    attributes: { 'data-ui-hover': 'rise', 'data-ui-idle': 'glow' },
    style: {
      '--surface-hover-fill': 'var(--hover-gradient)',
      '--surface-hover-duration': 'var(--t-d-normal)',
      '--surface-glow-color': 'var(--primary)',
      '--surface-glow-color-to': 'var(--secondary)',
      '--surface-glow-strength': 1.2,
      '--surface-glow-duration': '6s',
    },
    effects: { glow: true },
  });
});

test('standalone rise and glow use the surface channels independently', () => {
  assert.deepEqual(resolveSurfaceMotion({ hover: { effect: 'rise', duration: 0.55 }, idle: false }), {
    appearance: undefined,
      hover: undefined,
    attributes: { 'data-ui-hover': 'rise' },
    style: { '--surface-hover-duration': '0.55s' },
    effects: { glow: false },
  });
  assert.deepEqual(resolveSurfaceMotion({ hover: false, idle: { effect: 'glow' } }), {
    appearance: undefined,
      hover: undefined,
    attributes: { 'data-ui-idle': 'glow' },
    style: {},
    effects: { glow: true },
  });
});

test('the shared transform can run alone or alongside appearance and glow', () => {
  const hover = { effect: 'transform', source: 'parent', scale: 1.05 } as const;
  const appearance = { when: 'inView', effect: 'up' } as const;

  assert.deepEqual(resolveSurfaceMotion({ hover }).hover, hover);
  assert.deepEqual(resolveSurfaceMotion({ appearance, hover, idle: { effect: 'glow' } }), {
    appearance,
    hover,
    attributes: { 'data-ui-idle': 'glow' },
    style: {},
    effects: { glow: true },
  });
});

test('disabling the surface removes hover and idle while keeping appearance', () => {
  const appearance = { when: 'load', effect: 'up' } as const;

  for (const hover of [{ effect: 'rise' }, { effect: 'transform', scale: 1.05 }] as const) {
    assert.deepEqual(resolveSurfaceMotion({ appearance, hover, idle: { effect: 'glow' } }, true), {
      appearance,
      hover: undefined,
      attributes: undefined,
      style: undefined,
      effects: { glow: false },
    });
  }
});

test('rise CSS supports focus, linked states and disabled surfaces', () => {
  const url = new URL('../../../src/core/Motion/SurfaceMotion.module.scss', import.meta.url);
  const { css } = compileString(readFileSync(url, 'utf8'), { url });

  assert.match(css, /transform: translateY\(calc\(100% \+ 2 \* var\(--rpx, 1px\)\)\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\[state~=["']?hover["']?\]/);
  assert.match(css, /:not\(:disabled,\s*\[aria-disabled=["']?true["']?\],\s*\[state~=["']?disabled["']?\]/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*transition: none/);
  assert.doesNotMatch(css, /translate:|scale:/);
});

test('glow reads shared visibility, disables motion for hidden or inert surfaces and honors reduced motion', () => {
  const url = new URL('../../../src/core/Motion/SurfaceMotion.module.scss', import.meta.url);
  const { css } = compileString(readFileSync(url, 'utf8'), { url });

  assert.match(css, /--idle-animation-state:\s*paused/);
  assert.match(css, /animation-play-state: var\(--idle-animation-state\)/);
  assert.match(css, /\[hidden\] \*,\s*\[inert\],\s*\[inert\] \*\)[^{]*\{\s*visibility: hidden/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none/);
});
