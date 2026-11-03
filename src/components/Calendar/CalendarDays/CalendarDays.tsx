import { cx } from '../../../core';
import { UI_MESSAGES } from '../../../core/base/messages';
import * as dates from '../../../core/fields/date';
import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { Grid } from '../../Grid';
import { Text } from '../../Text';
import styles from './CalendarDays.module.scss';

interface CalendarDaysProps {
  id: string;
  month: Date;
  selected: Date | null;
  days: Date[];
  disabled: boolean;
  allows(day: Date): boolean;
  pick(day: Date): void;
}

export function CalendarDays({
  id,
  month,
  selected,
  days,
  disabled,
  allows,
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
          const currentMonth = day.getMonth() === month.getMonth();
          const dayDisabled = disabled || !allows(day);
          const chosen = !dayDisabled && dates.isSameDay(selected, day);
          const weekend = dates.isWeekend(day);
          const dayId = `${id}-day-${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const state = cx(
            !currentMonth && 'muted',
            weekend && 'weekend',
            dayDisabled && 'disabled',
            chosen && 'selected',
          );
          const background = chosen ? 'var(--primary)' : 'var(--background)';
          let color = currentMonth ? 'var(--text)' : 'var(--text-muted)';
          if (weekend && currentMonth) color = 'var(--error)';
          if (dayDisabled) color = 'var(--text-muted)';
          if (chosen) color = 'var(--white-100)';

          return (
            <Button
              id={dayId}
              key={dayId}
              type="button"
              aria-pressed={chosen}
              disabled={dayDisabled}
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
              onClick={() => pick(day)}
            >
              <Text
                  className={styles.dayText}
                  variant={['caption', 'caption', 'caption']}
                  color={color}
              >
                {day.getDate()}
              </Text>
            </Button>
          );
        })}
      </Grid>
    </Flex>
  );
}
