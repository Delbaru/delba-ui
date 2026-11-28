'use client';

import { useEffect, useRef, useState } from 'react';
import { calendar, useCalendar } from '#core/Calendar';
import { parseValue } from '../../core/fields/date';

interface CalendarModelOptions {
  value?: string;
  minValue?: string;
  maxValue?: string;
  disabled: boolean;
  onValueChange(value: string): void;
}

/** Adapts the shared calendar to the inline month chooser and date picker. */
export function useCalendarModel({
  value,
  minValue,
  maxValue,
  disabled,
  onValueChange,
}: CalendarModelOptions) {
  const [choosingMonth, setChoosingMonth] = useState(false);
  const selectedDate = parseValue(value ?? '');
  const previousValue = useRef(selectedDate);
  const model = useCalendar({
    value: selectedDate,
    onPick: onValueChange,
    disabled,
    minValue: parseValue(minValue ?? '') ?? undefined,
    maxValue: parseValue(maxValue ?? '') ?? undefined,
    minWeeks: 6,
  });
  const setMonth = model.month.set;
  const year = Number(model.month.current.slice(0, -3));
  const monthIndex = Number(model.month.current.slice(-2)) - 1;

  useEffect(() => {
    if (selectedDate === previousValue.current) return;
    previousValue.current = selectedDate;
    if (selectedDate) setMonth(calendar.monthOf(selectedDate));
  }, [selectedDate, setMonth]);

  function pick(day: string): void {
    if (!model.selection.pick(day)) return;
    setMonth(calendar.monthOf(day));
    setChoosingMonth(false);
  }

  function changeMonth(delta: number): void {
    if (!disabled) model.month.shift(delta);
  }

  function pickMonth(index: number): void {
    if (disabled) return;
    model.month.shift(index - monthIndex);
    setChoosingMonth(false);
  }

  function toggleMonth(): void {
    if (!disabled) setChoosingMonth((current) => !current);
  }

  return {
    month: {
      index: monthIndex,
      change: changeMonth,
      pick: pickMonth,
    },
    year: { current: year, change: (delta: number) => changeMonth(delta * 12) },
    selection: { pick },
    view: { choosingMonth, toggleMonth },
    days: model.days,
  };
}
