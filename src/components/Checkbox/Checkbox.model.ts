'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useEffect, useId, useRef, useState, type LabelHTMLAttributes } from 'react';
import {
    boxLayout,
    createLayoutClasses,
    cx,
    splitBoxLayout,
    splitRootDomProps,
    stateProps,
    useMergedRefs,
    type WithRef,
} from '#core';
import { useElement } from '#core/Element';
import { useFormField } from '#core/Form';
import { composeEventHandlers } from '../../core/composeEventHandlers';
import { useFormReset } from '../../core/useFormReset';
import { checkboxDefaults } from './Checkbox.config';
import type { CheckboxProps } from './Checkbox.types';
import styles from './Checkbox.module.scss';

const classes = createLayoutClasses(styles);

export function useCheckbox(input: WithRef<CheckboxProps, HTMLInputElement>) {
    const {
        ref,
        className = '',
        style,
        children,
        indeterminate = false,
        alignItems = checkboxDefaults.alignment,
        gap,
        perspective3d,
        parallax,
        animate,
        onMouseEnter,
        onMouseLeave,
        onClick,
        onFocus,
        onBlur,
        id: idProp,
        state,
        linkState,
        size,
        iconSize,
        indicator = true,
        'data-point-events': dataPointEvents,
        ...props
    } = resolvePresetProps(input);
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const { box, rest } = splitBoxLayout(props);
    const layout = boxLayout(classes, box);
    const { rootProps, elementProps } = splitRootDomProps(
        rest as typeof rest & Record<string, unknown>,
    );
    const { 'data-error': explicitError, ...nativeProps } = elementProps;
    const field = useFormField<boolean>(nativeProps.name);
    const bound =
        field &&
        nativeProps.checked === undefined &&
        nativeProps.defaultChecked === undefined &&
        (typeof field.value === 'boolean' || field.value === undefined);
    const dataError = explicitError ?? (bound ? field.error : undefined);
    const inputProps = bound
        ? {
              ...nativeProps,
              checked: Boolean(field.value),
              disabled: nativeProps.disabled || field.disabled,
              'aria-invalid': nativeProps['aria-invalid'] ?? Boolean(field.error),
          }
        : nativeProps;
    const isDisabled = Boolean(inputProps.disabled);
    const [uncontrolledChecked, setUncontrolledChecked] = useState(
        Boolean(inputProps.defaultChecked),
    );
    const isChecked = inputProps.checked ?? uncontrolledChecked;
    const isPassiveReadOnly =
        Boolean(inputProps.readOnly) &&
        !inputProps.onChange &&
        !onClick &&
        !onFocus &&
        !onBlur &&
        !onMouseEnter &&
        !onMouseLeave &&
        !linkState;
    const rootDataPointEvents = dataPointEvents ?? (isPassiveReadOnly ? 'none' : undefined);
    const element = useElement<HTMLLabelElement>({
        motion: { perspective3d, parallax, animate, disabled: isDisabled },
        style,
        linkState: isDisabled ? undefined : linkState,
        events: isDisabled
            ? undefined
            : [{ handlers: { onMouseEnter, onMouseLeave, onClick, onFocus, onBlur } }],
    });
    const inputRef = useRef<HTMLInputElement | null>(null);
    const setInputRef = useMergedRefs(inputRef, ref);
    useFormReset(inputRef, undefined, () => {
        if (inputProps.checked === undefined)
            setUncontrolledChecked(Boolean(inputProps.defaultChecked));
    });

    useEffect(() => {
        if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return {
        children,
        label: {
            ref: element.ref,
            htmlFor: id,
            'data-point-events': rootDataPointEvents,
            ...(rootProps as LabelHTMLAttributes<HTMLLabelElement>),
            ...element.attributes,
            ...element.events,
            className: cx(styles.Checkbox, element.className, ...layout, className),
            style: element.style,
            ...stateProps(
                state,
                isChecked && 'active',
                dataError && 'error',
                isDisabled && 'disabled',
            ),
        },
        effects: element.effects,
        input: {
            ref: setInputRef,
            id,
            type: 'checkbox' as const,
            className: styles.Input,
            ...inputProps,
            onChange: composeEventHandlers(
                inputProps.onChange,
                (event) => {
                    if (bound && !inputProps.readOnly) field.change(event.currentTarget.checked);
                    else if (inputProps.checked === undefined)
                        setUncontrolledChecked(event.currentTarget.checked);
                },
                { cancelable: true },
            ),
        },
        alignItems,
        gap: gap ?? checkboxDefaults.gap,
        indicator: indicator
            ? {
                  size: size ?? checkboxDefaults.size,
                  iconSize: iconSize ?? checkboxDefaults.iconSize,
                  isChecked,
              }
            : undefined,
    };
}
