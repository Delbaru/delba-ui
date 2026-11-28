'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useId, type LabelHTMLAttributes } from 'react';
import {
    composeEventHandlers,
    cx,
    createLayoutClasses,
    stateProps,
    boxLayout,
    splitBoxLayout,
    splitRootDomProps,
    type WithRef,
} from '#core';
import { useElement } from '#core/Element';
import { useFormField } from '#core/Form';
import { radioDefaults } from './Radio.config';
import type { RadioProps } from './Radio.types';
import styles from './Radio.module.scss';

const classes = createLayoutClasses(styles);

export function useRadio(input: WithRef<RadioProps, HTMLInputElement>) {
    const {
        ref,
        className = '',
        style,
        children,
        gap,
        perspective3d,
        parallax,
        animate,
        id: idProp,
        state,
        tone,
        size,
        dotSize,
        indicator = true,
        linkState,
        'data-point-events': dataPointEvents,
        ...layoutProps
    } = resolvePresetProps(input);
    const { box, rest } = splitBoxLayout(layoutProps);
    const { rootProps, elementProps } = splitRootDomProps(
        rest as typeof rest & Record<string, unknown>,
    );
    const props = elementProps;
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const field = useFormField<string | null>(props.name);
    const bound =
        field &&
        props.checked === undefined &&
        props.defaultChecked === undefined &&
        typeof props.value === 'string' &&
        (field.value === undefined || field.value === null || typeof field.value === 'string');
    const inputProps = bound
        ? {
              ...props,
              checked: field.value === props.value,
              disabled: props.disabled || field.disabled,
              'aria-invalid': props['aria-invalid'] ?? Boolean(field.error),
              onChange: composeEventHandlers(
                  props.onChange,
                  (event) => {
                      if (event.currentTarget.checked && !field.disabled)
                          field.change(props.value as string);
                  },
                  { cancelable: true },
              ),
          }
        : props;
    const isDisabled = Boolean(inputProps.disabled);
    const element = useElement<HTMLLabelElement>({
        motion: { perspective3d, parallax, animate, disabled: isDisabled },
        style: {
            ...(size != null ? { '--radio-box': size } : undefined),
            ...(dotSize != null ? { '--radio-dot': dotSize } : undefined),
            ...style,
        },
        linkState: isDisabled ? undefined : linkState,
    });

    const invalid = inputProps['aria-invalid'];
    return {
        gap: gap ?? radioDefaults.gap,
        children,
        indicator,
        label: {
            ref: element.ref,
            htmlFor: id,
            'data-point-events': dataPointEvents,
            ...(rootProps as LabelHTMLAttributes<HTMLLabelElement>),
            'data-tone': tone,
            ...element.attributes,
            ...element.events,
            className: cx(styles.Radio, element.className, ...boxLayout(classes, box), className),
            style: element.style,
            ...stateProps(
                state,
                Boolean(inputProps.checked) && 'active',
                Boolean(invalid && invalid !== 'false') && 'error',
                isDisabled && 'disabled',
            ),
        },
        effects: element.effects,
        input: { ref, id, type: 'radio' as const, className: styles.Input, ...inputProps },
    };
}
