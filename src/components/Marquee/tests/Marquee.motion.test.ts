import assert from 'node:assert/strict';
import test from 'node:test';
import { marqueeMotion } from '../Marquee.motion';

test('cyclic position remains seamless in either direction and across many periods', () => {
  assert.equal(marqueeMotion.wrap(205, 100), 5);
  assert.equal(marqueeMotion.wrap(-5, 100), 95);
  assert.equal(marqueeMotion.wrap(-300, 100), 0);
});

test('throw uses recent movement direction and bounds pathological sample velocity', () => {
  assert.equal(marqueeMotion.fling({ t: 0, x: 0 }, { t: 100, x: 20 }), -200);
  assert.equal(marqueeMotion.fling({ t: 0, x: 10 }, { t: 100, x: 0 }), 100);
  assert.equal(marqueeMotion.fling({ t: 1, x: 0 }, { t: 2, x: 100 }), -4000);
  assert.equal(marqueeMotion.fling({ t: 1, x: 0 }, { t: 1, x: 20 }), 0);
});
