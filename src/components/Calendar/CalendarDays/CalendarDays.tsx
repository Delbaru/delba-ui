import { cx } from '#core';
import type { CalendarDay } from '#core/Calendar';
import { UI_MESSAGES } from '../../../core/base/messages';
import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { Grid } from '../../Grid';
import { Text } from '../../Text';
import styles from './CalendarDays.module.scss';

interface CalendarDaysProps {
  id: string;
  days: readonly CalendarDay[];
  pick(day: string): void;
}

export function CalendarDays({
  id,
  days,
  pick,
}: CalendarDaysProps) {
  return (
    <Flex className={styles.CalendarDays} dir={['column', 'column', 'column']} gap={[8, 8, 8]}>
      <Grid columns={[7, 7, 7]}>
        {UI_MESSAGES.calendar.weekdays.map((label, index) => (
          <Flex
              key={index}
              align={['center', 'center', 'center']}
              justify={['center', 'center', 'center']}
              w={[40, 40, 40]}
              h={[40, 40, 40]}
          >
            <Text variant={['caption', 'caption', 'caption']} color="var(--text-muted)">
              {label}
            </Text>
          </Flex>
        ))}
      </Grid>

      <Grid columns={[7, 7, 7]} gap={[4, 4, 4]}>
        {days.map((day) => {
          const { date, inMonth, disabled, selected, weekend, number } = day;
          const chosen = !disabled && selected;
          const year = Number(date.slice(0, -6));
          const monthIndex = Number(date.slice(-5, -3)) - 1;
          const dayId = `${id}-day-${year}-${monthIndex}-${number}`;
          const state = cx(
            !inMonth && 'muted',
            weekend && 'weekend',
            disabled && 'disabled',
            chosen && 'selected',
          );
          const background = chosen ? 'var(--primary)' : 'var(--background)';
          let color = inMonth ? 'var(--text)' : 'var(--text-muted)';
          if (weekend && inMonth) color = 'var(--error)';
          if (disabled) color = 'var(--text-muted)';
          if (chosen) color = 'var(--white-100)';

          return (
            <Button
              id={dayId}
              key={dayId}
              type="button"
              aria-pressed={chosen}
              disabled={disabled}
              w={[40, 40, 40]}
              h={[40, 40, 40]}
              r={[8, 8, 8]}
              className={styles.day}
              bg={[background, background, background]}
              state={state}
              linkState={[
                { target: dayId, on: 'hover', set: 'hover' },
                { target: dayId, on: 'active', set: 'active' },
              ]}
              onClick={() => pick(date)}
            >
              <Text
                  className={styles.dayText}
                  variant={['caption', 'caption', 'caption']}
                  color={color}
              >
                {number}
              </Text>
            </Button>
          );
        })}
      </Grid>
    </Flex>
  );
}
