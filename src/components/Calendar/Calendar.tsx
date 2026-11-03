'use client';

import { useId } from 'react';
import { cx } from '../../core';
import { Flex } from '../Flex';
import { CalendarDays } from './CalendarDays/CalendarDays';
import { CalendarHeader } from './CalendarHeader/CalendarHeader';
import { CalendarMonths } from './CalendarMonths/CalendarMonths';
import { calendarConfig } from './Calendar.config';
import { useCalendarModel } from './Calendar.model';
import type { CalendarComponentProps } from './Calendar.types';
import styles from './Calendar.module.scss';

/** An inline date chooser whose value and bounds use local `YYYY-MM-DD` dates. */
export function Calendar({
  ref,
  id,
  value,
  minValue,
  maxValue,
  disabled = false,
  dayIdPrefix,
  onValueChange,
  className,
  style,
  'aria-label': ariaLabel,
  ...layoutProps
}: CalendarComponentProps) {
  const generatedId = useId();
  const calendarId = id ?? generatedId;
  const controlId = dayIdPrefix ?? calendarId;
  const model = useCalendarModel({ value, minValue, maxValue, disabled, onValueChange });

  return (
    <Flex
        {...calendarConfig.surface}
        {...layoutProps}
        ref={ref}
        id={calendarId}
        role="group"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={cx(styles.Calendar, className)}
        style={style}
    >
      <CalendarHeader
          id={calendarId}
          month={model.month.current}
          disabled={disabled}
          choosingMonth={model.view.choosingMonth}
          changeMonth={model.month.change}
          changeYear={model.year.change}
          toggleMonth={model.view.toggleMonth}
      />

      <Flex
        id={`${calendarId}-calendar-grid`}
        animate={{
          when: 'change',
          effect: 'fade',
          key: model.view.choosingMonth ? 'months' : 'days',
          duration: 'fast',
        }}
        dir={['column', 'column', 'column']}
        h={calendarConfig.contentHeight}
      >
        {model.view.choosingMonth ? (
          <CalendarMonths
              current={model.month.current.getMonth()}
              disabled={disabled}
              pick={model.month.pick}
          />
        ) : (
          <CalendarDays
              id={controlId}
              month={model.month.current}
              selected={model.selection.current}
              days={model.days}
              disabled={disabled}
              allows={model.selection.allows}
              pick={model.selection.pick}
          />
        )}
      </Flex>
    </Flex>
  );
}
