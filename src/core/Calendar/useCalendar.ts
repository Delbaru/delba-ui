'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { defineCollection, useCollection } from '#core/Collection';
import { calendar, type CalendarGridOptions } from './Calendar';

const datesCollection = defineCollection<string>('calendar', (date) => date);
const EMPTY: readonly never[] = [];

export interface CalendarOptions<T = never> extends CalendarGridOptions {
  /** Controlled visible month in `YYYY-MM` format. */
  month?: string;
  defaultMonth?: string;
  onMonthChange?(month: string): void;
  /** Reference day in `YYYY-MM-DD` format. Defaults to the viewer's local day. */
  today?: string;
  /** JavaScript weekday numbers, Sunday = 0 through Saturday = 6. */
  weekendDays?: readonly number[];
  items?: readonly T[];
  getDate?(item: T): string | null | undefined;
  /** Controlled single date. Pass null for a controlled empty selection. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?(date: string | null): void;
  /** Invoked for every allowed pick, including a pick of the selected date. */
  onPick?(date: string): void;
  minValue?: string;
  maxValue?: string;
  /** Blocks picking and clearing a date. */
  disabled?: boolean;
}

export interface CalendarDay<T = never> {
  date: string;
  number: number;
  inMonth: boolean;
  today: boolean;
  weekend: boolean;
  selected: boolean;
  disabled: boolean;
  items: readonly T[];
}

/** Month navigation and selection for a calendar rendered by its caller. */
export function useCalendar<T = never>({
  month,
  defaultMonth,
  onMonthChange,
  today = calendar.today(),
  weekStartsOn,
  weekendDays,
  minWeeks,
  items = EMPTY,
  getDate,
  value,
  defaultValue,
  onValueChange,
  onPick,
  minValue,
  maxValue,
  disabled = false,
}: CalendarOptions<T> = {}) {
  const selectedDate = calendar.parseDate(value);
  const initialDate = calendar.parseDate(defaultValue);
  const minimum = calendar.parseDate(minValue);
  const maximum = calendar.parseDate(maxValue);
  const [internalMonth, setInternalMonth] = useState(() =>
    defaultMonth ?? calendar.openingMonth(value === undefined ? initialDate : selectedDate, minimum, maximum, today),
  );
  const currentMonth = month ?? internalMonth;
  const pendingMonth = useRef(currentMonth);
  useLayoutEffect(() => {
    pendingMonth.current = currentMonth;
  }, [currentMonth]);
  const dates = useMemo(
    () => calendar.monthGrid(currentMonth, { weekStartsOn, minWeeks }),
    [currentMonth, weekStartsOn, minWeeks],
  );
  const grouped = useMemo(
    () => getDate ? calendar.groupItems(items, getDate) : new Map<string, readonly T[]>(),
    [items, getDate],
  );
  const selection = useCollection(datesCollection, dates, {
    mode: 'single',
    retainMissing: true,
    value: value === undefined ? undefined : selectedDate ? [selectedDate] : EMPTY,
    defaultValue: initialDate ? [initialDate] : EMPTY,
    onValueChange: onValueChange && ((ids) => onValueChange(ids[0] ?? null)),
  });
  const currentValue = selection.ids[0] ?? null;

  function setMonth(next: string): void {
    if (next === pendingMonth.current || !calendar.parseDate(`${next}-01`)) return;
    if (month === undefined) {
      pendingMonth.current = next;
      setInternalMonth(next);
    }
    onMonthChange?.(next);
  }

  function shiftMonth(count: number): void {
    setMonth(calendar.shiftMonth(pendingMonth.current, count));
  }

  function enabled(date: string): boolean {
    return !disabled && date.length === 10 && calendar.isWithinBounds(date, minimum, maximum);
  }

  function allows(date: string): boolean {
    return enabled(date) && dates.includes(date);
  }

  function pick(date: string): boolean {
    if (!allows(date)) return false;
    selection.select(date);
    onPick?.(date);
    return true;
  }

  function clear(): void {
    if (!disabled) selection.clear();
  }

  const days: CalendarDay<T>[] = dates.map((date) => ({
    date,
    number: Number(date.slice(-2)),
    inMonth: calendar.monthOf(date) === currentMonth,
    today: date === today,
    weekend: calendar.isWeekend(date, weekendDays),
    selected: date === currentValue,
    disabled: !enabled(date),
    items: grouped.get(date) ?? EMPTY,
  }));
  const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, (index + 1) * 7));

  return {
    month: {
      current: currentMonth,
      set: setMonth,
      shift: shiftMonth,
      next: () => shiftMonth(1),
      previous: () => shiftMonth(-1),
    },
    days,
    weeks,
    grouped,
    focusDate: (date: string, key: string) => calendar.focusDate(dates, date, key),
    selection: { value: currentValue, allows, pick, clear },
  };
}
