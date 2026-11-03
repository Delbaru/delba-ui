'use client';

import type { ComponentProps } from 'react';
import { cx } from '../../core';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { DurationWheel } from './DurationWheel/DurationWheel';
import { resolveDurationPickerModel } from './DurationPicker.model';
import styles from './DurationPicker.module.scss';

export interface DurationPickerProps {
  /** Controlled duration in whole minutes. */
  value: number;
  /** Called after a wheel, pointer, click or keyboard change. */
  onValueChange: (minutes: number) => void;
  /** Inclusive duration limit, in minutes. Defaults to 24 hours. */
  maxMinutes?: number;
  /** Disables both wheels and removes them from keyboard navigation. */
  disabled?: boolean;
  /** Accessible name of the whole control. */
  'aria-label'?: string;
  /** Localized accessible names of the hour and minute wheels. */
  labels?: { hours: string; minutes: string };
  /** Additional root class. */
  className?: string;
  /** Reference to the stable root Flex node. */
  ref?: ComponentProps<typeof Flex>['ref'];
}

/** Two bounded wheels for a controlled duration value, measured in whole minutes. */
export function DurationPicker({
  value,
  onValueChange,
  maxMinutes = 1440,
  disabled = false,
  labels = { hours: 'Hours', minutes: 'Minutes' },
  className,
  ref,
  'aria-label': ariaLabel = 'Duration',
}: DurationPickerProps) {
  const model = resolveDurationPickerModel({ value, maxMinutes, onValueChange });

  return (
    <Flex
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        className={cx(styles.DurationPicker, 'ui-duration-picker', className)}
        position={['relative', 'relative', 'relative']}
        w={['max-content', 'max-content', 'max-content']}
        maxW={[128, 128, 128]}
        gap={[4, 4, 4]}
        p={[4, 4, 4]}
        r={[8, 8, 8]}
        bg={['var(--background)', 'var(--background)', 'var(--background)']}
        border={['1px solid var(--line)', '1px solid var(--line)', '1px solid var(--line)']}
    >
      <Flex
          position={['absolute', 'absolute', 'absolute']}
          top={['50%', '50%', '50%']}
          left={[4, 4, 4]}
          right={[4, 4, 4]}
          h={[24, 24, 24]}
          r={[4, 4, 4]}
          className={cx(styles.SelectedBand, 'ui-duration-selected-band')}
          aria-hidden="true"
      />
      <DurationWheel {...model.wheels.hours} label={labels.hours} disabled={disabled} />
      <Flex
          position={['relative', 'relative', 'relative']}
          w={[8, 8, 8]}
          h={[72, 72, 72]}
          align={['center', 'center', 'center']}
          justify={['center', 'center', 'center']}
          aria-hidden="true"
      >
        <Text
            variant={['small', 'small', 'small']}
            fontWeight={[600, 600, 600]}
            color="var(--text)"
        >
          :
        </Text>
      </Flex>
      <DurationWheel {...model.wheels.minutes} label={labels.minutes} disabled={disabled} />
    </Flex>
  );
}
