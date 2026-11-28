'use client';

import { cx } from '#core';
import { Select } from '../Select';
import { TabTrack } from '../TabTrack';
import { ChoiceButton } from './ChoiceButton/ChoiceButton';
import { useChoiceButtons } from './ChoiceButtons.model';
import type { ChoiceButtonsProps } from './ChoiceButtons.types';
import styles from './ChoiceButtons.module.scss';

export type { ChoiceButtonsItem, ChoiceButtonsProps } from './ChoiceButtons.types';

export function ChoiceButtons<T extends string = string>(props: ChoiceButtonsProps<T>) {
    const choices = useChoiceButtons(props);
    const {
        items, className, itemClassName, buttonClassName, textClassName, infoClassName, tooltipClassName,
        animate, perspective3d, parallax,
    } = props;
    const motion = { animate, perspective3d, parallax };

    return (
        <>
            <TabTrack
                {...choices.desktop}
                {...motion}
                value={choices.selectedValue}
                thumb='primary'
                dir={['row', null, null]}
                align={['center', null, null]}
                p={[4, null, null]}
                r={[12, null, null]}
                bg={['var(--background)', 'var(--background)', 'var(--background)']}
                className={cx(styles.ChoiceButtons, className)}
                hide={[false, true, true]}
            >
                {items.map(item => (
                  <ChoiceButton
                      key={item.value}
                      item={item}
                      selected={item.value === choices.selectedValue}
                      select={choices.selectItem}
                      disabled={choices.disabled}
                      itemClassName={itemClassName}
                      buttonClassName={buttonClassName}
                      textClassName={textClassName}
                      infoClassName={infoClassName}
                      tooltipClassName={tooltipClassName}
                  />
                ))}
            </TabTrack>

            <Select
                {...choices.mobile}
                {...motion}
                className={styles.ChoiceButtons}
                hide={[true, false, false]}
            />
        </>
    );
}
