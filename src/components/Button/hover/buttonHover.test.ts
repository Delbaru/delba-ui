import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { compileString } from 'sass';

import { buttonHoverProps } from './buttonHover';

test('button hover is opt-in and leaves appearance effects to shared motion', () => {
  for (const animate of [undefined, 'rise', ['rise'], { when: 'load', effect: 'up' }, { when: 'hover', effect: 'circle' }]) {
    assert.deepEqual(buttonHoverProps(animate), {});
  }
  assert.deepEqual(buttonHoverProps({ when: 'hover', effect: 'rise', fill: 'var(--primary-dark)', duration: 'normal' }), {
    'data-button-hover': 'rise',
    style: { '--button-hover-fill': 'var(--primary-dark)', '--button-hover-duration': 'var(--t-d-normal)' },
  });
  const style = buttonHoverProps({ when: 'hover', effect: 'rise', duration: 0.55 }).style as Record<string, unknown>;
  assert.equal(style['--button-hover-duration'], '0.55s');
});

test('rise CSS supports focus, linked states, disabled controls and reduced motion', () => {
  const source = readFileSync(new URL('./_button-hover.scss', import.meta.url), 'utf8');
  const { css } = compileString(source, { url: new URL('./_button-hover.scss', import.meta.url) });
  assert.match(css, /transform: translateY\(calc\(100% \+ 2 \* var\(--rpx, 1px\)\)\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\[state~=hover\]/);
  assert.match(css, /:not\(:disabled,\s*\[aria-disabled=true\],\s*\[state~=disabled\]\)/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*transition: none/);
  assert.doesNotMatch(css, /translate:|scale:/);
});

test('idle glow can compose rise hover without changing hover-only or idle-only behavior', () => {
  assert.deepEqual(buttonHoverProps({ when: 'idle', effect: 'glow' }), {});
  assert.deepEqual(buttonHoverProps({ when: 'idle', effect: 'glow', hover: { effect: 'circle' } }), {});
  assert.deepEqual(buttonHoverProps({ when: 'load', effect: 'up', hover: { effect: 'rise' } }), { 'data-button-hover': 'rise', style: {} });
  assert.deepEqual(buttonHoverProps({
    when: 'idle', effect: 'glow', color: 'var(--secondary)',
    hover: { effect: 'rise', fill: 'var(--partner-hover-gradient)', duration: 'normal' },
  }), {
    'data-button-hover': 'rise',
    style: { '--button-hover-fill': 'var(--partner-hover-gradient)', '--button-hover-duration': 'var(--t-d-normal)' },
  });
});


test('appearance retains configured hover and can explicitly disable it', () => {
  assert.deepEqual(buttonHoverProps({ when: 'inView', effect: 'up', hover: { effect: 'rise', fill: 'var(--secondary)' } }), {
    'data-button-hover': 'rise', style: { '--button-hover-fill': 'var(--secondary)' },
  });
  assert.deepEqual(buttonHoverProps({ when: 'inView', effect: 'up', hover: false }), {});
});
