import assert from 'node:assert/strict';
import test from 'node:test';

import { advanceScroll, createScrollState, initialScroll } from './scroll-direction';

const options = { threshold: { enter: 32, exit: 16 }, direction: { down: 32, up: 8 } };

test('scroll threshold has hysteresis and direction tolerates small reversals', () => {
  let state = advanceScroll(initialScroll, 32, options);
  assert.equal(state.pastThreshold, true);
  assert.equal(state.direction, 'down');
  state = advanceScroll(state, 30, options);
  state = advanceScroll(state, 31, options);
  assert.equal(state.direction, 'down');
  state = advanceScroll(state, 24, options);
  assert.equal(state.direction, 'down');
  state = advanceScroll(state, 23, options);
  assert.equal(state.direction, 'up');
  assert.equal(state.pastThreshold, true);
  state = advanceScroll(state, 16, options);
  assert.equal(state.pastThreshold, false);
});

test('zero motion does not discard accumulated travel; returning to top resets direction', () => {
  let state = advanceScroll(initialScroll, 16, options);
  state = advanceScroll(state, 16, options);
  state = advanceScroll(state, 32, options);
  assert.equal(state.direction, 'down');
  state = advanceScroll(state, 0, options);
  assert.deepEqual(state, initialScroll);
});

test('down and up measure accumulated travel and reset immediately on reversal', () => {
  let snapshot = advanceScroll(initialScroll, 20, {});
  assert.equal(createScrollState(snapshot).down(32), false);
  snapshot = advanceScroll(snapshot, 32, {});
  assert.equal(createScrollState(snapshot).down(32), true);
  assert.equal(createScrollState(snapshot).up(), false);
  snapshot = advanceScroll(snapshot, 31, {});
  assert.equal(createScrollState(snapshot).down(32), false);
  assert.equal(createScrollState(snapshot).up(32), false);
  snapshot = advanceScroll(snapshot, 64, {});
  snapshot = advanceScroll(snapshot, 32, {});
  assert.equal(createScrollState(snapshot).up(32), true);
  snapshot = advanceScroll(snapshot, 0, {});
  assert.equal(createScrollState(snapshot).down(0), false);
  assert.equal(createScrollState(snapshot).up(0), false);
});
