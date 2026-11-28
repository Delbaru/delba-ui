'use client';

import { assetUrl, stateProps, type WithRef } from '#core';
import { MotionLayers } from '#core/Motion';
import checkIcon from '#icons/controls/check.svg';
import { Flex } from '../Flex';
import { Icon } from '../Icon';
import { useCheckbox } from './Checkbox.model';
import type { CheckboxProps } from './Checkbox.types';
import styles from './Checkbox.module.scss';

export type { CheckboxProps } from './Checkbox.types';

export function Checkbox(props: WithRef<CheckboxProps, HTMLInputElement>) {
    const { label, effects, input, alignItems, gap, indicator, children } = useCheckbox(props);

    return (
        <label {...label}>
            <MotionLayers effects={effects} />
            <Flex gap={gap} align={[alignItems, alignItems, alignItems]} grow={[1, 1, 1]} minW={[0, 0, 0]}>
                <input {...input} />
                {indicator && (
                    <Flex
                        className={styles.Box}
                        w={indicator.size}
                        h={indicator.size}
                        r={[8, 8, 8]}
                        align={['center', 'center', 'center']}
                        justify={['center', 'center', 'center']}
                        border={['calc(1 * var(--rpx)) solid var(--checkbox-box-border, var(--text-muted))', 'calc(1 * var(--rpx)) solid var(--checkbox-box-border, var(--text-muted))', 'calc(1 * var(--rpx)) solid var(--checkbox-box-border, var(--text-muted))']}
                        aria-hidden
                        {...stateProps(indicator.isChecked && 'active')}
                    >
                        <Icon
                            src={assetUrl(checkIcon)}
                            w={indicator.iconSize}
                            h={indicator.iconSize}
                            fill="var(--white-100)"
                            className={styles.icon}
                            aria-hidden
                        />
                    </Flex>
                )}
                {children}
            </Flex>
        </label>
    );
}
