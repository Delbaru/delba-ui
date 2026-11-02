'use client';

import { useEffect, useMemo, useState } from 'react';
import * as dates from '../../core/fields/date';

interface CalendarModelOptions {
  value?: string;
  minValue?: string;
  maxValue?: string;
  disabled: boolean;
  onValueChange(value: string): void;
}

/** Owns the selected-date view, visible month, navigation, and range checks for inline Calendar. */
export function useCalendarModel({
  value,
  minValue,
  maxValue,
  disabled,
  onValueChange,
}: CalendarModelOptions) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    dates.resolveOpeningMonth(value, minValue, maxValue));
  const [choosingMonth, setChoosingMonth] = useState(false);
  const selectedDate = useMemo(() => dates.parseValue(value ?? ''), [value]);
  const minimum = useMemo(() => dates.parseValue(minValue ?? ''), [minValue]);
  const maximum = useMemo(() => dates.parseValue(maxValue ?? ''), [maxValue]);
  const days = useMemo(() => dates.buildCalendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    setVisibleMonth((current) => {
      const selectedMonth = dates.getMonthStart(selectedDate);
      return current.getFullYear() === selectedMonth.getFullYear() &&
        current.getMonth() === selectedMonth.getMonth()
        ? current
        : selectedMonth;
    });
  }, [selectedDate]);

  function allows(day: Date): boolean {
    return !disabled && dates.isWithinBounds(day, minimum, maximum);
  }

  function pick(day: Date): void {
    if (!allows(day)) return;
    onValueChange(dates.formatIso(day));
    setVisibleMonth(dates.getMonthStart(day));
    setChoosingMonth(false);
  }

  function changeMonth(delta: number): void {
    if (disabled) return;
    setVisibleMonth((current) => dates.addMonth(current, delta));
  }

  function changeYear(delta: number): void {
    if (disabled) return;
    setVisibleMonth((current) => new Date(current.getFullYear() + delta, current.getMonth(), 1));
  }

  function pickMonth(index: number): void {
    if (disabled) return;
    setVisibleMonth((current) => new Date(current.getFullYear(), index, 1));
    setChoosingMonth(false);
  }

  function toggleMonth(): void {
    if (!disabled) setChoosingMonth((current) => !current);
  }

  return {
    month: {
      current: visibleMonth,
      change: changeMonth,
      pick: pickMonth,
    },
    year: { change: changeYear },
    selection: { current: selectedDate, allows, pick },
    view: { choosingMonth, toggleMonth },
    days,
  };
}
