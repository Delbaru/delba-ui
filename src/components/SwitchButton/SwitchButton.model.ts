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
import { switchButtonDefaults } from './SwitchButton.config';
import type { SwitchButtonProps } from './SwitchButton.types';
import styles from './SwitchButton.module.scss';

const classes = createLayoutClasses(styles);

export function useSwitchButton(input: WithRef<SwitchButtonProps, HTMLInputElement>) {
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
    const field = useFormField<boolean>(props.name);
    const bound =
        field &&
        props.checked === undefined &&
        props.defaultChecked === undefined &&
        (typeof field.value === 'boolean' || field.value === undefined);
    const inputProps = bound
        ? {
              ...props,
              checked: Boolean(field.value),
              disabled: props.disabled || field.disabled,
              'aria-invalid': props['aria-invalid'] ?? Boolean(field.error),
              onChange: composeEventHandlers(
                  props.onChange,
                  (event) => {
                      if (!props.readOnly && !field.disabled)
                          field.change(event.currentTarget.checked);
                  },
                  { cancelable: true },
              ),
          }
        : props;
    const isDisabled = Boolean(inputProps.disabled);
    const element = useElement<HTMLLabelElement>({
        motion: { perspective3d, parallax, animate, disabled: isDisabled },
        style,
        linkState: isDisabled ? undefined : linkState,
    });

    const invalid = inputProps['aria-invalid'];
    return {
        gap: gap ?? switchButtonDefaults.gap,
        children,
        label: {
            ref: element.ref,
            htmlFor: id,
            'data-point-events': dataPointEvents,
            ...(rootProps as LabelHTMLAttributes<HTMLLabelElement>),
            ...element.attributes,
            ...element.events,
            className: cx(
                styles.SwitchButton,
                element.className,
                ...boxLayout(classes, box),
                className,
            ),
            style: element.style,
            ...stateProps(
                state,
                Boolean(inputProps.checked) && 'active',
                Boolean(invalid && invalid !== 'false') && 'error',
                isDisabled && 'disabled',
            ),
        },
        effects: element.effects,
        input: { ref, id, type: 'checkbox' as const, className: styles.Input, ...inputProps },
    };
}
