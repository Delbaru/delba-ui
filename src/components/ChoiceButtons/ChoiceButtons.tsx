'use client';

import { useId, useRef, useState } from 'react';
import { useFormReset } from '../../core/useFormReset';
import { cx } from '../../core';
import { useFormField } from '../../core/Form';
import { Select } from '../Select';
import { TabTrack } from '../TabTrack';
import { ChoiceButton } from './ChoiceButton/ChoiceButton';
import type { ChoiceButtonsItem, ChoiceButtonsProps } from './ChoiceButtons.types';
import styles from './ChoiceButtons.module.scss';

export type { ChoiceButtonsItem, ChoiceButtonsProps } from './ChoiceButtons.types';

export function ChoiceButtons<T extends string = string>({
    items,
    name,
    form,
    value,
    defaultValue = null,
    disabled = false,
    required = false,
    onChange,
    className = '',
    itemClassName = '',
    buttonClassName = '',
    textClassName = '',
    infoClassName = '',
    tooltipClassName = '',
}: ChoiceButtonsProps<T>) {
    const field = useFormField<T | null>(name);
    const bound = Boolean(field && value === undefined &&
        (field.value === undefined || field.value === null || typeof field.value === 'string'));
    const isControlled = value !== undefined || bound;
    const [internalValue, setInternalValue] = useState<T | null>(defaultValue);
    const isDisabled = disabled || Boolean(bound && field?.disabled);
    const fieldError = bound ? field?.error : undefined;
    const baseId = useId().replace(/:/g, '');
    const fieldRef = useRef<HTMLDivElement>(null);
    useFormReset(fieldRef, form, () => {
        if (!isControlled) setInternalValue(defaultValue);
    });

    const selectedValue = bound ? (field?.value as T | null | undefined) ?? null : isControlled ? value ?? null : internalValue;

    const selectItem = (item: ChoiceButtonsItem<T>) => {
        if (isDisabled) return;
        if (bound) field?.change(item.value);
        else if (!isControlled) setInternalValue(item.value);

        item.onSelect?.(item.value);
        onChange?.(item.value, item);
    };

    const handleMobileTabletSelectChange = (nextValue: T | null) => {
        if (nextValue == null) {
            if (bound) field?.change(null);
            else if (!isControlled) setInternalValue(null);
            return;
        }

        const selectedItem = items.find((item) => item.value === nextValue);
        if (selectedItem) selectItem(selectedItem);
    };

    return (
        <>
            <TabTrack
                value={selectedValue}
                thumb='primary'
                dir={['row', null, null]}
                align={['center', null, null]}
                p={[4, null, null]}
                r={[12, null, null]}
                bg={['var(--background)', 'var(--background)', 'var(--background)']}
                className={cx(styles.ChoiceButtons, className)}
                hide={[false, true, true]}
                aria-required={required || undefined}
            >
                {items.map((item, index) => (
                  <ChoiceButton
                      key={item.value}
                      item={item}
                      selected={item.value === selectedValue}
                      tooltipId={`${baseId}-tooltip-${index}`}
                      select={selectItem}
                      disabled={isDisabled}
                      itemClassName={itemClassName}
                      buttonClassName={buttonClassName}
                      textClassName={textClassName}
                      infoClassName={infoClassName}
                      tooltipClassName={tooltipClassName}
                  />
                ))}
            </TabTrack>

            <Select
                ref={fieldRef}
                name={name}
                form={form}
                multiple={false}
                options={items.map(({ value: itemValue, label }) => ({ value: itemValue, label }))}
                value={selectedValue}
                onChange={handleMobileTabletSelectChange}
                visibleOptions={Math.min(items.length, 3)}
                disabled={isDisabled}
                required={required}
                error={fieldError}
                className={styles.ChoiceButtons}
                hide={[true, false, false]}
            />
        </>
    );
}
