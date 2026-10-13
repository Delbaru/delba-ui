import assert from 'node:assert/strict';
import test from 'node:test';

import { buttonIdleProps } from './buttonIdle';

test('idle glow shares the motion API without consuming hover or appearance effects', () => {
  for (const config of [undefined, { when: 'hover', effect: 'rise' }, { when: 'load', effect: 'up' }]) {
    assert.deepEqual(buttonIdleProps(config), {});
  }
  assert.deepEqual(buttonIdleProps({ when: 'idle', effect: 'glow', color: 'var(--primary)', duration: 8 }), {
    'data-button-idle': 'glow',
    style: { '--button-glow-color': 'var(--primary)', '--button-glow-duration': '8s' },
  });
});

test('idle glow accepts a second color and brightness without consuming its hover settings', () => {
  assert.deepEqual(buttonIdleProps({
    when: 'idle', effect: 'glow', color: 'var(--secondary)', colorTo: 'var(--secondary-hover)',
    strength: 1.2, duration: 6, hover: { effect: 'rise', fill: 'var(--partner-hover-gradient)' },
  }), {
    'data-button-idle': 'glow',
    style: {
      '--button-glow-color': 'var(--secondary)', '--button-glow-color-to': 'var(--secondary-hover)',
      '--button-glow-strength': 1.2, '--button-glow-duration': '6s',
    },
  });
});
