'use client';

import type { WithRef } from '#core';
import { MotionLayers } from '#core/Motion';
import { Flex } from '../Flex';
import { useSwitchButton } from './SwitchButton.model';
import type { SwitchButtonProps } from './SwitchButton.types';
import styles from './SwitchButton.module.scss';

export type { SwitchButtonProps } from './SwitchButton.types';

export function SwitchButton(props: WithRef<SwitchButtonProps, HTMLInputElement>) {
  const { label, effects, input, gap, children } = useSwitchButton(props);

  return (
    <label {...label}>
      <MotionLayers effects={effects} />
      <Flex gap={gap} align={['center', 'center', 'center']}>
        <input {...input} />
        <Flex align={['center', 'center', 'center']} className={styles.Track} aria-hidden>
          <span className={styles.Thumb} />
        </Flex>
        {children}
      </Flex>
    </label>
  );
}
