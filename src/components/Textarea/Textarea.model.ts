'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useMemo } from 'react';
import {
    createLayoutClasses,
    cx,
    fieldHelperPaddingLeft,
    fieldLayoutClasses,
    fieldRootLayoutClasses,
    resolveFieldLayout,
    splitBoxLayout,
    stateProps,
    type WithRef,
} from '#core';
import { useFormField } from '#core/Form';
import { useField, useFieldFeedback } from '../Field';
import { useTextareaEditing } from './useTextareaEditing';
import { textareaConfig } from './Textarea.config';
import type { TextareaProps } from './Textarea.types';
import styles from './Textarea.module.scss';

const classes = createLayoutClasses(styles, { local: { h: 'height' } });

export function useTextarea(rawInput: WithRef<TextareaProps, HTMLTextAreaElement>) {
    const input = resolvePresetProps(rawInput, { target: 'field' });
    const controller = useFormField<string>(input.name);
    const bound =
        controller &&
        input.value === undefined &&
        input.defaultValue === undefined &&
        (typeof controller.value === 'string' || controller.value === undefined);
    const props: typeof input = bound
        ? {
              ...input,
              value: typeof controller.value === 'string' ? controller.value : '',
              disabled: input.disabled || controller.disabled,
              error: input.error ?? controller.error,
              onValueChange: (value, details) => {
                  controller.change(value);
                  input.onValueChange?.(value, details);
              },
          }
        : input;
    const { box, rest } = splitBoxLayout(props);
    const {
        ref,
        className,
        style,
        variant,
        size,
        perspective3d,
        parallax,
        animate,
        color,
        font,
        placeholderColor,
        seed,
        loading = false,
        label,
        labelColor,
        comment,
        rows = 3,
        autoGrow,
        autoContinue,
        slots,
        layout: fieldLayout = 'column',
        gap,
        length,
        showCount,
        countPlacement = 'inside',
        error,
        errorPlacement = 'inside',
        collapse,
        onChange,
        onValueChange,
        onFocus,
        onBlur,
        required,
        emptyMessage,
        validate,
        state,
        linkState,
        fieldClassName,
        field: fieldStyle,
        'data-point-events': pointEvents,
        ...native
    } = rest;
    const policy = useMemo(() => textareaConfig.policy({ length }), [length?.min, length?.max]);
    const field = useField<HTMLTextAreaElement>({
        ref,
        id: native.id,
        value: native.value,
        defaultValue: native.defaultValue,
        inputProps: native,
        policy,
        error,
        seed,
        required,
        emptyMessage,
        validate,
        disabled: native.disabled,
        readOnly: native.readOnly,
        onChange,
        onValueChange,
        onFocus,
        onBlur,
        onInvalid: native.onInvalid,
        onKeyDown: native.onKeyDown,
    });
    const editing = useTextareaEditing(
        field.control.target,
        {
            autoGrow,
            autoContinue,
            rows,
            loading,
            disabled: native.disabled,
            readOnly: native.readOnly,
        },
        field.value.current,
    );
    const layout = resolveFieldLayout({ ...box, variant, size, color, placeholderColor });
    const feedback = useFieldFeedback({
        id: field.id,
        error: field.validation.message,
        comment,
        placement: errorPlacement,
        active: field.focus.active,
        describedBy: native['aria-describedby'],
        paddingLeft: fieldHelperPaddingLeft(layout.p, layout.pl),
    });
    const counter = {
        visible: showCount ?? length?.max !== undefined,
        placement: countPlacement,
        text: field.value.current.length + '/' + (length?.max ?? textareaConfig.counterMaximum),
    };

    return {
        layout: {
            collapse,
            className: cx(
                styles.Textarea,
                styles.TextareaWrapper,
                ...classes.value('text', font ? [font, font, font] : undefined),
                ...fieldRootLayoutClasses(classes, box),
                className,
            ),
            style,
            animate,
            perspective3d,
            parallax,
            linkState,
            'data-point-events': pointEvents,
            ...stateProps(
                state,
                field.focus.active && 'active',
                field.validation.message && 'error',
                native.disabled && 'disabled',
            ),
        },
        label: label ? { text: label, color: labelColor, htmlFor: field.id, required } : undefined,
        control: {
            appearance: {
                'data-ui-preset-field': '',
                className: cx(
                    ...fieldLayoutClasses(classes, layout),
                    ...classes.value('grow', box.grow),
                    fieldClassName,
                ),
                ...stateProps(
                    state,
                    native.disabled && 'disabled',
                    field.validation.message && 'error',
                    field.focus.active && 'active',
                    field.value.hasValue && 'filled',
                ),
            },
            focus: field.focus.request,
            loading,
            rows,
            autoGrow,
            slots,
            layout: fieldLayout,
            gap,
            fieldStyle,
            counter,
            feedback: feedback.inline,
            native: {
                ...native,
                ...field.control.props,
                ...field.events,
                rows,
                minLength: length?.min,
                maxLength: length?.max,
                'aria-describedby': feedback.describedBy,
                onInput(event: React.FormEvent<HTMLTextAreaElement>) {
                    editing.measure();
                    native.onInput?.(event);
                },
                onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
                    field.events.onKeyDown(event);
                    editing.continueLine(event);
                },
                onBlur(event: React.FocusEvent<HTMLTextAreaElement>) {
                    field.events.onBlur(event);
                    field.focus.leave(false);
                },
            },
            ref: field.control.ref,
        },
        error: feedback.below.error,
        comment: feedback.below.comment,
        counter,
    };
}
