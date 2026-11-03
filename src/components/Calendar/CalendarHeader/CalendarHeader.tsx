import { assetUrl, cx, stateProps } from '../../../core';
import { UI_MESSAGES } from '../../../core/base/messages';
import arrowIcon from '../../../../assets/icons/ui/arrows/style-2/arrow.svg';
import chevronIcon from '../../../../assets/icons/ui/arrows/style-3/arrow.svg';
import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { Icon } from '../../Icon';
import { Text } from '../../Text';
import { calendarConfig } from '../Calendar.config';
import styles from './CalendarHeader.module.scss';

interface CalendarHeaderProps {
  id: string;
  month: Date;
  disabled: boolean;
  choosingMonth: boolean;
  changeMonth(delta: number): void;
  changeYear(delta: number): void;
  toggleMonth(): void;
}

export function CalendarHeader({
  id,
  month,
  disabled,
  choosingMonth,
  changeMonth,
  changeYear,
  toggleMonth,
}: CalendarHeaderProps) {
  const labels = UI_MESSAGES.calendar;

  return (
    <Flex
        className={styles.CalendarHeader}
        align={['center', 'center', 'center']}
        justify={['space_between', 'space_between', 'space_between']}
        gap={[8, 8, 8]}
    >
      <Button
          type="button"
          aria-label={labels.previousMonth}
          disabled={disabled}
          w={[40, 40, 40]}
          h={[40, 40, 40]}
          r={[8, 8, 8]}
          bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
          border={calendarConfig.surface.border}
          className={cx(styles.btn, styles.prev)}
          onClick={() => changeMonth(-1)}
      >
        <Icon src={assetUrl(arrowIcon)} w={[18, 18, 18]} h={[18, 18, 18]} aria-hidden="true" />
      </Button>

      <Flex align={['center', 'center', 'center']} gap={[16, 16, 16]}>
        <Button
            type="button"
            aria-label={labels.chooseMonth}
            aria-expanded={choosingMonth}
            aria-controls={`${id}-calendar-grid`}
            disabled={disabled}
            gap={[4, 4, 4]}
            className={styles.monthPick}
            {...stateProps(choosingMonth && 'active')}
            onClick={toggleMonth}
        >
          <Text variant={['inherit', 'inherit', 'inherit']}>{labels.months[month.getMonth()]}</Text>
          <Icon
              src={assetUrl(chevronIcon)}
              w={[20, 20, 20]}
              h={[20, 20, 20]}
              rootClassName={cx(styles.btn, styles.prev)}
              aria-hidden="true"
          />
        </Button>

        <Flex align={['center', 'center', 'center']} gap={[4, 4, 4]} className={styles.yearPick}>
          <Text variant={['inherit', 'inherit', 'inherit']}>{month.getFullYear()}</Text>
          <Flex dir={['column', 'column', 'column']} align={['center', 'center', 'center']}>
            <Button
                type="button"
                aria-label={labels.nextYear}
                disabled={disabled}
                w={[20, 20, 20]}
                h={[16, 16, 16]}
                className={cx(styles.btn, styles.prev)}
                onClick={() => changeYear(1)}
            >
              <Icon
                  src={assetUrl(chevronIcon)}
                  w={[16, 16, 16]}
                  h={['auto', 'auto', 'auto']}
                  aria-hidden="true"
              />
            </Button>
            <Button
                type="button"
                aria-label={labels.previousYear}
                disabled={disabled}
                w={[20, 20, 20]}
                h={[16, 16, 16]}
                className={cx(styles.btn, styles.next)}
                onClick={() => changeYear(-1)}
            >
              <Icon
                  src={assetUrl(chevronIcon)}
                  w={[16, 16, 16]}
                  h={['auto', 'auto', 'auto']}
                  aria-hidden="true"
              />
            </Button>
          </Flex>
        </Flex>
      </Flex>

      <Button
          type="button"
          aria-label={labels.nextMonth}
          disabled={disabled}
          w={[40, 40, 40]}
          h={[40, 40, 40]}
          r={[8, 8, 8]}
          bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
          border={calendarConfig.surface.border}
          className={cx(styles.btn, styles.next)}
          onClick={() => changeMonth(1)}
      >
        <Icon src={assetUrl(arrowIcon)} w={[18, 18, 18]} h={[18, 18, 18]} aria-hidden="true" />
      </Button>
    </Flex>
  );
}
