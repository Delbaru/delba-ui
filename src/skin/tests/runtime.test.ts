import assert from 'node:assert/strict';
import test from 'node:test';

import { defineSkin, useSkin } from '../runtime';

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
