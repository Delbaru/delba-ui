import assert from 'node:assert/strict';
import test from 'node:test';

import { framesEqual, gapFrameStyle, sizeFrameStyle, type CollapseFrame } from './collapse';

const frame = (patch: Partial<CollapseFrame> = {}): CollapseFrame => ({
  size: 0,
  padStart: 0,
  padEnd: 0,
  borderStart: 0,
  borderEnd: 0,
  gap: 0,
  opacity: 0,
  ...patch,
});

test('sizeFrameStyle: по высоте едут height и всё, без чего ноль недостижим', () => {
  const open = frame({ size: 240, padStart: 16, padEnd: 16, borderStart: 1, borderEnd: 1 });

  assert.deepEqual(sizeFrameStyle(open, 'row'), {
    height: '240px',
    paddingTop: '16px',
    paddingBottom: '16px',
    borderTopWidth: '1px',
    borderBottomWidth: '1px',
  });
});

test('sizeFrameStyle: ось column ведёт ширину и боковые отступы, а не высоту', () => {
  const open = frame({ size: 120, padStart: 8, padEnd: 4, borderStart: 2, borderEnd: 0 });

  assert.deepEqual(sizeFrameStyle(open, 'column'), {
    width: '120px',
    paddingLeft: '8px',
    paddingRight: '4px',
    borderLeftWidth: '2px',
    borderRightWidth: '0px',
  });
});

test('gapFrameStyle: зазор — отступ обёртки по той же оси', () => {
  assert.deepEqual(gapFrameStyle(frame({ gap: 12 }), 'row'), { paddingTop: '12px' });
  assert.deepEqual(gapFrameStyle(frame({ gap: 12 }), 'column'), { paddingLeft: '12px' });
});

test('framesEqual: ехать некуда, если совпали ВСЕ поля, а не только размер', () => {
  assert.equal(framesEqual(frame({ size: 100 }), frame({ size: 100 })), true);
  assert.equal(framesEqual(frame({ size: 100 }), frame({ size: 0 })), false);
  assert.equal(framesEqual(frame({ size: 100 }), frame({ size: 100, gap: 8 })), false, 'зазор тоже движение');
  assert.equal(
    framesEqual(frame({ size: 100 }), frame({ size: 100, opacity: 1 })),
    false,
    'затухание тоже движение'
  );
});
