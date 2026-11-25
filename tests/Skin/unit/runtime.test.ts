import assert from 'node:assert/strict';
import test from 'node:test';
import { createRef } from 'react';

import { defineSkin, useSkin } from '../../../src/skin/runtime';

const def = defineSkin({
  component: 'Example',
  presetProp: 'skin',
  axes: { fill: ['none', 'surface'] as const },
  defaults: { fill: 'none' },
  presets: {
    regular: { fill: 'surface', w: 300, h: 40, grow: true },
    bare: {},
  },
});
const styles = { skin: 'base', 'skin-regular': 'regular' };

test('skin geometry uses full responsive tuples and passes callback-ref cleanup through', () => {
  const ref = (_node: HTMLElement | null) => () => {};
  const result = useSkin(def, { styles, preset: 'regular', props: {}, ref });

  assert.deepEqual(result.w, [300, 300, 300]);
  assert.deepEqual(result.h, [40, 40, 40]);
  assert.deepEqual(result.grow, [1, 1, 1]);
  assert.equal(result.ref, ref);
  assert.equal(result.axes.fill, 'surface');
});

test('explicit responsive geometry beats the preset; no-scales configs remain valid', () => {
  const result = useSkin(def, {
    styles,
    preset: 'regular',
    props: { fill: 'none' },
    w: [240, null, 120],
    h: [48, 48, 48],
    grow: [0, 0, 0],
  });

  assert.deepEqual(result.w, [240, null, 120]);
  assert.deepEqual(result.h, [48, 48, 48]);
  assert.deepEqual(result.grow, [0, 0, 0]);
  assert.equal(result.axes.fill, 'none');
});

test('scaled skins keep preset steps and allow zero and fractional instance spacing', () => {
  const scaled = defineSkin({
    component: 'Scaled',
    presetProp: 'skin',
    axes: { fill: ['none', 'surface'] },
    scales: { gap: [0, 4, 8] },
    defaults: { fill: 'none' },
    presets: { compact: { fill: 'surface', gap: 4 } },
  });

  assert.equal(useSkin(scaled, { styles, preset: 'compact', props: {} }).axes.gap, 4);
  const gap: [number, null, number] = [0, null, 2.5];
  const result = useSkin(scaled, { styles, preset: 'compact', props: { gap } });
  assert.equal(result.axes.gap, gap);
  assert.equal(result.axes.fill, 'surface');
  assert.equal(useSkin(scaled, { styles, preset: 'compact', props: { gap: 0 } }).axes.gap, 0);
});

test('zero preset geometry and native object refs survive without a wrapper', () => {
  const zero = defineSkin({
    component: 'Zero',
    presetProp: 'skin',
    axes: {},
    presets: { zero: { w: 0, h: 0, grow: false } },
  });
  const ref = createRef<HTMLInputElement>();
  const style = { opacity: 0 };
  const result = useSkin(zero, { styles, preset: 'zero', props: {}, ref, style });

  assert.deepEqual(result.w, [0, 0, 0]);
  assert.deepEqual(result.h, [0, 0, 0]);
  assert.equal(result.grow, undefined);
  assert.equal(result.ref, ref);
  assert.equal(result.style, style);
});

test('missing presets use only axis defaults and leave unspecified geometry alone', () => {
  const result = useSkin(def, { styles, preset: 'missing', props: {} });
  assert.equal(result.axes.fill, 'none');
  assert.equal(result.className, 'base sk_fill_none');
  assert.equal(result.w, undefined);
  assert.equal(result.h, undefined);
  assert.equal(result.grow, undefined);
});
