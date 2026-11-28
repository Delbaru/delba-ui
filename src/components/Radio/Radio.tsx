'use client';

import type { WithRef } from '#core';
import { MotionLayers } from '#core/Motion';
import { Flex } from '../Flex';
import { useRadio } from './Radio.model';
import type { RadioProps } from './Radio.types';
import styles from './Radio.module.scss';

export type { RadioProps } from './Radio.types';

export function Radio(props: WithRef<RadioProps, HTMLInputElement>) {
    const { label, effects, input, gap, indicator, children } = useRadio(props);

    return (
        <label {...label}>
            <MotionLayers effects={effects} />
            <Flex gap={gap} align={['center', 'center', 'center']}>
                <input {...input} />
                {indicator && (
                    <Flex className={styles.Box} aria-hidden>
                        <span className={styles.Dot} />
                    </Flex>
                )}
                {children}
            </Flex>
        </label>
    );
}
