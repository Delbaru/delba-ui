import type React from 'react';
import type { BoxLayoutProps, WithRef } from '../../core';

export interface CalendarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'dir' | 'onChange'>,
    BoxLayoutProps {
  /** Selected date as a local calendar value (`YYYY-MM-DD`), not a UTC timestamp. */
  value?: string;
  /** Called with a selected date as `YYYY-MM-DD`. */
  onValueChange(value: string): void;
  /** Inclusive lower date bound in `YYYY-MM-DD` format. */
  minValue?: string;
  /** Inclusive upper date bound in `YYYY-MM-DD` format. */
  maxValue?: string;
  /** Prevents navigation and selection. */
  disabled?: boolean;
  /** Keeps day-button ids stable when Calendar is anchored to an existing field id. */
  dayIdPrefix?: string;
}

export type CalendarComponentProps = WithRef<CalendarProps, HTMLDivElement>;
