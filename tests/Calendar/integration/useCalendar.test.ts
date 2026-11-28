import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCalendar, type CalendarOptions } from '../../../src/core/Calendar';

type Entry = { date: string; title: string };

function readCalendar(options: CalendarOptions<Entry>) {
  const snapshot: { current?: ReturnType<typeof useCalendar<Entry>> } = {};
  function Probe() {
    snapshot.current = useCalendar(options);
    return null;
  }

  renderToStaticMarkup(createElement(Probe));
  assert.ok(snapshot.current);
  return snapshot.current;
}

test('a custom calendar can render weeks, selection and item groups from day data', () => {
  const entry = { date: '2024-02-01', title: 'Planning' };
  const model = readCalendar({
    today: entry.date,
    defaultValue: entry.date,
    weekStartsOn: 0,
    weekendDays: [4],
    minValue: entry.date,
    items: [entry],
    getDate: (item) => item.date,
  });

  assert.equal(model.month.current, '2024-02');
  assert.equal(model.weeks[0]?.[0]?.date, '2024-01-28');
  assert.equal(model.weeks[0]?.[0]?.disabled, true);
  assert.equal(model.selection.value, entry.date);
  assert.equal(model.focusDate(entry.date, 'Home'), '2024-01-28');
  assert.deepEqual(model.days.find((day) => day.date === entry.date), {
    date: entry.date,
    number: 1,
    inMonth: true,
    today: true,
    weekend: true,
    selected: true,
    disabled: false,
    items: [entry],
  });
});

test('controlled month navigation reports requests and keeps off-screen selection', () => {
  const requested: string[] = [];
  const model = readCalendar({
    month: '2024-12',
    value: '2024-10-01',
    onMonthChange: (month) => requested.push(month),
  });

  model.month.next();
  model.month.previous();
  model.month.set('2024-02');
  model.month.set('2024-12');
  model.month.set('2024-13');

  assert.deepEqual(requested, ['2025-01', '2024-11', '2024-02']);
  assert.equal(model.month.current, '2024-12');
  assert.equal(model.selection.value, '2024-10-01');
  assert.ok(model.days.every((day) => !day.selected));
});
