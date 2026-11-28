'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { FocusEvent, MouseEvent } from 'react';
import { useMergedRefs, type WithRef } from '#core';
import { useFormField } from '#core/Form';
import { useTextOverflow } from '../../hooks/useTextOverflow';
import { useField, useFieldFeedback, focusContains } from '../Field';
import { useDatePicker } from './InputCalendar/InputCalendar';
import { inputConfig } from './Input.config';
import { inputModes } from './Input.modes';
import { useInputActions } from './InputActions/InputActions';
import type { InputProps } from './Input.types';
import styles from './Input.module.scss';

function useInputBinding(
    props: WithRef<InputProps, HTMLInputElement>,
): WithRef<InputProps, HTMLInputElement> {
    const field = useFormField<unknown>(props.name);
    const nativeFile = useRef<HTMLInputElement | null>(null);
    const fileRef = useMergedRefs(nativeFile, props.ref);
    const files =
        props.type === 'file' &&
        props.value === undefined &&
        props.defaultValue === undefined &&
        field &&
        (Array.isArray(field.value) || field.value === undefined)
            ? ((field.value as File[] | undefined) ?? [])
            : undefined;

    // Clear obsolete native selections after reset or acknowledgement. The form
    // controller still holds the File objects because FileList cannot be assigned.
    useLayoutEffect(() => {
        const node = nativeFile.current;
        if (!files || !node) return;
        const selected = Array.from(node.files ?? []);
        if (selected.some((file) => !files.includes(file))) node.value = '';
    });

    if (!field || props.value !== undefined || props.defaultValue !== undefined) return props;
    if (files) {
        return {
            ...props,
            ref: fileRef,
            value: undefined,
            defaultValue: undefined,
            seed: undefined,
            disabled: props.disabled || field.disabled,
            error: props.error ?? field.error,
            onChange: (event) => {
                props.onChange?.(event);
                if (!event.defaultPrevented && !field.disabled)
                    field.change(Array.from(event.currentTarget.files ?? []));
            },
        };
    }
    if (props.type === 'file' || (field.value !== undefined && typeof field.value !== 'string'))
        return props;
    return {
        ...props,
        value: field.value ?? '',
        disabled: props.disabled || field.disabled,
        error: props.error ?? field.error,
        onValueChange: (value, details) => {
            field.change(value);
            props.onValueChange?.(value, details);
        },
    };
}

/** Connects one field engine to Input's view and optional calendar. */
export function useInput(input: WithRef<InputProps, HTMLInputElement>) {
    const props = useInputBinding(resolvePresetProps(input, { target: 'field' }));
    const options = inputConfig.read(props);
    const mode = useMemo(
        () =>
            inputModes.resolve({
                type: props.type,
                phoneFormat: props.phone,
                min: props.min,
                max: props.max,
                numberOptions: props.numberOptions,
            }),
        [props.type, props.phone, props.min, props.max, props.numberOptions],
    );
    const rootRef = useRef<HTMLElement | null>(null);
    const rowRef = useRef<HTMLElement | null>(null);
    const field = useField({
        ...options,
        policy: mode.policy,
        readOnly: Boolean(props.readOnly),
        lockAutofill: mode.locksAutofill && props.autoComplete === 'off',
    });
    const calendar = useDatePicker({
        enabled: mode.calendar,
        disabled: props.disabled || props.readOnly,
        value: field.value.current,
        minValue: mode.constraints.min,
        maxValue: mode.constraints.max,
        rootRef,
        anchorRef: rowRef,
        onCommit: field.value.pick,
        onValidate: field.validation.check,
        onFocus: field.focus.request,
    });
    const active = field.focus.active || calendar.popup.visible;
    const appearance = inputConfig.appearance(props, {
        active,
        hasValue: field.value.hasValue,
        readOnly: Boolean(props.readOnly),
        error: field.validation.message,
        inputType: mode.inputType,
    });
    const feedback = useFieldFeedback({
        id: field.id,
        error: field.validation.message,
        comment: props.comment,
        placement: mode.errorPlacement ?? props.errorPlacement ?? 'inside',
        active,
        describedBy: props['aria-describedby'],
        errorClassName: styles.belowError,
        paddingLeft: appearance.helperPadding,
    });
    const actions = useInputActions({
        ...props,
        type: mode.inputType,
        readOnly: Boolean(props.readOnly),
        onStep: field.value.step,
        calendar: {
            available: calendar.available,
            open: calendar.popup.visible,
            id: `${field.id}-calendar`,
            toggle: calendar.toggle,
        },
    });
    const overflow = useTextOverflow<HTMLInputElement>();
    const inputRef = useMergedRefs(field.control.ref, overflow.setNode);
    const overflowText =
        mode.inputType !== 'password' && !active && !props.loading && overflow.isOverflowing
            ? overflow.text
            : undefined;
    const cancelCalendar = calendar.cancel;

    useEffect(() => {
        cancelCalendar();
    }, [field.resetKey, cancelCalendar]);

    function leave(event: FocusEvent<HTMLElement>) {
        const inside = focusContains(event, [rootRef, calendar.popup.surfaceRef]);
        field.focus.leave(inside);
        if (inside || !mode.calendar) return;
        calendar.close();
    }

    function activate(event: MouseEvent<HTMLElement>) {
        if (props.disabled || event.defaultPrevented) return;
        const owner = event.currentTarget.ownerDocument.defaultView;
        if (!owner || !(event.target instanceof owner.Element)) return;
        if (!event.currentTarget.contains(event.target)) return;
        if (event.target.closest('[data-input-action="true"]')) return;
        if (mode.calendar) calendar.toggle();
        else field.focus.request();
    }

    const inputProps = {
        ...options.inputProps,
        ...field.control.props,
        ...mode.nativeAttributes(field.value.current, active, props),
        ...field.events,
        type: actions.password.visible && actions.password.revealed ? 'text' : mode.domInputType,
        required: Boolean(props.nativeValidation && props.required),
        'aria-describedby': feedback.describedBy,
        onFocus(event: React.FocusEvent<HTMLInputElement>) {
            field.events.onFocus(event);
            if (mode.calendar) calendar.enter();
        },
        onChange(event: React.ChangeEvent<HTMLInputElement>) {
            field.events.onChange(event);
            if (!event.defaultPrevented && mode.calendar) calendar.open();
        },
        onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
            field.events.onKeyDown(event);
            if (!event.defaultPrevented) calendar.keyboard.handle(event);
        },
    };

    return {
        slots: props.slots,
        layout: {
            ...appearance.root,
            ref: rootRef,
            'data-point-events': props['data-point-events'],
        },
        label: appearance.label ? { ...appearance.label, htmlFor: field.id } : undefined,
        feedback: feedback.below,
        control: {
            inputProps,
            inputRef,
            rowRef,
            appearance: appearance.control,
            onClick: activate,
            onBlur: leave,
            overflowText,
            field: props.field,
            feedback: feedback.inline,
            loading: Boolean(props.loading),
        },
        decoration: mode.decoration(field.value.current, active),
        actions,
        calendar: {
            ...calendar,
            id: field.id,
            enabled: mode.calendar,
            leave() {
                calendar.close();
                field.focus.leave(false);
            },
        },
    };
}
