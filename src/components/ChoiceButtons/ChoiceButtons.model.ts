'use client';

import { useRef, useState } from 'react';
import { useFormField } from '#core/Form';
import { useFormReset } from '../../core/useFormReset';
import { choiceButtonsDefaults } from './ChoiceButtons.config';
import type { ChoiceButtonsItem, ChoiceButtonsProps } from './ChoiceButtons.types';

export function useChoiceButtons<T extends string>({
    items, name, form, value, defaultValue = null, disabled = false, required = false, onChange,
}: ChoiceButtonsProps<T>) {
    const field = useFormField<T | null>(name);
    const bound = field && value === undefined &&
        (field.value === undefined || field.value === null || typeof field.value === 'string');
    const isControlled = value !== undefined || bound;
    const [internalValue, setInternalValue] = useState<T | null>(defaultValue);
    const isDisabled = disabled || Boolean(bound && field.disabled);
    const valueChanged = (next: T | null) => {
        if (bound) field.change(next);
        else if (!isControlled) setInternalValue(next);
    };
    const fieldRef = useRef<HTMLDivElement>(null);
    useFormReset(fieldRef, form, () => {
        if (!isControlled) setInternalValue(defaultValue);
    });

    const selectedValue = bound ? field.value ?? null : isControlled ? value ?? null : internalValue;
    const selectItem = (item: ChoiceButtonsItem<T>) => {
        if (isDisabled) return;
        valueChanged(item.value);
        item.onSelect?.(item.value);
        onChange?.(item.value, item);
    };

    function selectValue(nextValue: T | null) {
        if (isDisabled) return;
        if (nextValue === null) {
            valueChanged(null);
            return;
        }
        const item = items.find(option => option.value === nextValue);
        if (item) selectItem(item);
    }

    return {
        selectedValue,
        selectItem,
        disabled: isDisabled,
        desktop: { 'data-ui-form-field': bound ? name : undefined, 'aria-required': required || undefined },
        mobile: {
            ref: fieldRef,
            name,
            form,
            multiple: false as const,
            options: items.map(({ value, label }) => ({ value, label })),
            value: selectedValue,
            onChange: selectValue,
            visibleOptions: Math.min(items.length, choiceButtonsDefaults.visibleOptions),
            disabled: isDisabled,
            required,
            error: bound ? field.error : undefined,
        },
    };
}
