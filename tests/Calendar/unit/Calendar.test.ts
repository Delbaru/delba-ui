import assert from 'node:assert/strict';
import test from 'node:test';
import { calendar } from '@delba/frontend/calendar';

test('grids include complete weeks and can extend to a fixed height', () => {
  assert.equal(calendar.monthGrid('2021-02').length, 28);
  assert.equal(calendar.monthGrid('2020-08').length, 42);
  const leapMonth = calendar.monthGrid('2024-02');
  assert.equal(leapMonth.length, 35);
  assert.equal(leapMonth[0], '2024-01-29');
  assert.equal(leapMonth.at(-1), '2024-03-03');
  assert.ok(leapMonth.includes('2024-02-29'));

  const fixed = calendar.monthGrid('2021-02', { weekStartsOn: 0, minWeeks: 6 });
  assert.equal(fixed.length, 42);
  assert.equal(fixed[0], '2021-01-31');
  assert.equal(fixed.at(-1), '2021-03-13');
});

test('date-only arithmetic crosses year and DST boundaries', () => {
  assert.equal(calendar.shiftMonth('2024-12', 1), '2025-01');
  assert.equal(calendar.shiftMonth('2025-01', -1), '2024-12');
  assert.equal(calendar.addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(calendar.addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(calendar.weekStart('2026-10-25'), '2026-10-19');
  assert.equal(calendar.isWeekend('2026-10-25'), true);
  assert.equal(calendar.isWeekend('2026-10-26'), false);
  assert.equal(calendar.isWeekend('2026-10-25', [5, 6]), false);
});

test('only valid ISO dates pass parsing and bounds are inclusive', () => {
  assert.equal(calendar.parseDate('2024-02-29'), '2024-02-29');
  assert.equal(calendar.parseDate('2023-02-29'), null);
  assert.equal(calendar.parseDate('2024-02-29T14:00:00Z'), null);
  assert.equal(calendar.isWithinBounds('2026-09-15', '2026-09-15', '2026-09-20'), true);
  assert.equal(calendar.isWithinBounds('2026-09-21', '2026-09-15', '2026-09-20'), false);
});

test('opening month prefers selection, otherwise clamps today to a supplied bound', () => {
  const today = '2026-09-18';
  assert.equal(calendar.openingMonth('2026-03-05', '2026-06-01', null, today), '2026-03');
  assert.equal(calendar.openingMonth(null, null, null, today), '2026-09');
  assert.equal(calendar.openingMonth(null, '2026-12-14', null, today), '2026-12');
  assert.equal(calendar.openingMonth(null, '2020-01-01', null, today), '2026-09');
  assert.equal(calendar.openingMonth(null, null, '2026-02-10', today), '2026-02');
});

test('grouping keeps input order and outside dates and skips undated items', () => {
  const outside = { date: '2024-01-29' };
  const sameDay = Array.from({ length: 5 }, () => ({ date: '2024-02-01' }));
  const items = [outside, ...sameDay, { date: null }];
  const grouped = calendar.groupItems(items, (item) => item.date);
  assert.deepEqual(grouped.get('2024-01-29'), [outside]);
  assert.deepEqual(grouped.get('2024-02-01'), sameDay);
  assert.equal(grouped.has('2024-02-02'), false);
});

test('keyboard movement includes outside days and stops at the visible grid edge', () => {
  const days = calendar.monthGrid('2024-02');
  assert.equal(calendar.focusDate(days, '2024-02-01', 'ArrowLeft'), '2024-01-31');
  assert.equal(calendar.focusDate(days, '2024-02-01', 'ArrowDown'), '2024-02-08');
  assert.equal(calendar.focusDate(days, '2024-02-01', 'Home'), '2024-01-29');
  assert.equal(calendar.focusDate(days, '2024-02-01', 'End'), '2024-02-04');
  assert.equal(calendar.focusDate(days, '2024-01-29', 'ArrowLeft'), null);
  assert.equal(calendar.focusDate(days, '2024-02-01', 'Enter'), null);
});
