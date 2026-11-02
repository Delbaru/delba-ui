import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutMoveFrames, type LayoutBox } from '../layout';

const previous: LayoutBox = { left: 10, top: 20, width: 40, height: 80, opacity: 1 };

test('stationary and unpainted boxes do not create unnecessary layout motion', () => {
  assert.equal(layoutMoveFrames(previous, previous), null);
  assert.equal(layoutMoveFrames(previous, { ...previous, width: 0 }), null);
});

test('an interrupted entry resumes its painted opacity while moving and resizing', () => {
  const frames = layoutMoveFrames(
    { ...previous, opacity: 0.4 },
    { left: 20, top: 40, width: 80, height: 40 },
  );
  assert.deepEqual(frames, [
    { translate: '-10px -20px', scale: '0.5 2', opacity: 0.4 },
    { translate: '0px 0px', scale: '1 1', opacity: 1 },
  ]);
});
