import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCalendarDays,
  formatDisplay,
  formatIso,
  isWithinBounds,
  parseValue,
  resolveOpeningMonth,
} from '../../../core/fields/date';

const TODAY = new Date(2026, 8, 18);
const month = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}`;

test('выбранный день решает месяц, даже если он раньше min', () => {
  assert.equal(month(resolveOpeningMonth('05.03.2026', '01.06.2026', undefined, TODAY)), '2026-3');
});

test('пустое значение — это «не выбрано»: открываемся на сегодня', () => {
  assert.equal(month(resolveOpeningMonth('', undefined, undefined, TODAY)), '2026-9');
});

test('min в будущем двигает открытие вперёд — «Дата окончания» после декабрьского начала', () => {
  assert.equal(month(resolveOpeningMonth('', '14.12.2026', undefined, TODAY)), '2026-12');
});

test('min в прошлом открытие НЕ тянет назад', () => {
  assert.equal(month(resolveOpeningMonth('', '01.01.2020', undefined, TODAY)), '2026-9');
});

test('max в прошлом двигает открытие назад', () => {
  assert.equal(month(resolveOpeningMonth(undefined, undefined, '10.02.2026', TODAY)), '2026-2');
});

test('date parsing rejects overflow and keeps valid ISO and display values', () => {
  const leapDay = parseValue('2024-02-29');
  assert.ok(leapDay);
  assert.equal(formatDisplay(leapDay), '29.02.2024');
  assert.equal(formatIso(leapDay), '2024-02-29');
  assert.equal(parseValue('29.02.2023'), null);
  assert.equal(parseValue('31.04.2025'), null);
});

test('calendar days are six Monday-first weeks, and range bounds are inclusive', () => {
  const days = buildCalendarDays(new Date(2026, 8, 18));
  assert.equal(days.length, 42);
  assert.equal(days[0]?.getDay(), 1);
  assert.equal(days[41]?.getDay(), 0);

  const min = parseValue('15.09.2026');
  const max = parseValue('20.09.2026');
  assert.equal(isWithinBounds(new Date(2026, 8, 15), min, max), true);
  assert.equal(isWithinBounds(new Date(2026, 8, 21), min, max), false);
});
