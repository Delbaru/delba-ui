import assert from 'node:assert/strict';
import test from 'node:test';
import { appendToast } from '../Toast.queue';
import type { ToastItem } from '../Toast.types';

const item = (id: string, open = true): ToastItem => ({ id, title: id, open });

test('queue evicts oldest open cards and retains exit cards until collapse completes', () => {
  const current = [item('closing', false), item('first'), item('second')];
  const result = appendToast(current, item('third'), 2);
  assert.deepEqual(result.map(card => [card.id, card.open]), [
    ['closing', false], ['first', false], ['second', true], ['third', true],
  ]);
  assert.equal(current[1]?.open, true);
});
