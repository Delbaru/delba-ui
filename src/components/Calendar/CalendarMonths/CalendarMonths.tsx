
import styles from './CalendarMonths.module.scss';
import { UI_MESSAGES } from '../../../core/base/messages';
import { Button } from '../../Button';
import { Grid } from '../../Grid';
import { Text } from '../../Text';
import { calendarConfig } from '../Calendar.config';

interface CalendarMonthsProps {
  current: number;
  disabled: boolean;
  pick(index: number): void;
}

export function CalendarMonths({ current, disabled, pick }: CalendarMonthsProps) {
  return (
    <Grid
        className={styles.CalendarMonths}
        columns={calendarConfig.monthColumns}
        rows={calendarConfig.monthRows}
        gap={[8, 8, 8]}
        h={['100%', '100%', '100%']}
    >
      {UI_MESSAGES.calendar.months.map((label, index) => {
        const selected = index === current;
        const background = selected ? 'var(--primary)' : 'var(--background)';

        return (
          <Button
              key={index}
              type="button"
              disabled={disabled}
              h={['100%', '100%', '100%']}
              r={[8, 8, 8]}
              border={calendarConfig.surface.border}
              bg={[background, background, background]}
              onClick={() => pick(index)}
          >
            <Text
                variant={['caption', 'caption', 'caption']}
                color={selected ? 'var(--white-100)' : undefined}
            >
              {label.slice(0, 3)}
            </Text>
          </Button>
        );
      })}
    </Grid>
  );
}
