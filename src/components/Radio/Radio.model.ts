'use client';

import { useId } from 'react';
import { composeEventHandlers, cx, createLayoutClasses, stateProps, layoutSpaceClasses, radiusClasses, type WithRef } from '#core';
import { useElement } from '#core/Element';
import { useFormField } from '#core/Form';
import { radioDefaults } from './Radio.config';
import type { RadioProps } from './Radio.types';
import styles from './Radio.module.scss';

const classes = createLayoutClasses(styles);

export function useRadio({
    ref,
    className = '',
    style,
    children,
    gap,
    p,
    pt,
    pr,
    pb,
    pl,
    m,
    mt,
    mr,
    mb,
    ml,
    r,
    tlr,
    trr,
    brr,
    blr,
    borderTLR,
    borderTRR,
    borderBRR,
    borderBLR,
    grow,
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
    ...props
}: WithRef<RadioProps, HTMLInputElement>) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const field = useFormField<string | null>(props.name);
    const bound = field && props.checked === undefined && typeof props.value === 'string' &&
        (field.value === undefined || field.value === null || typeof field.value === 'string');
    const inputProps = bound ? {
        ...props,
        checked: field.value === props.value,
        disabled: props.disabled || field.disabled,
        'aria-invalid': props['aria-invalid'] ?? Boolean(field.error),
        onChange: composeEventHandlers(props.onChange, event => {
            if (event.currentTarget.checked && !field.disabled) field.change(props.value as string);
        }, { cancelable: true }),
    } : props;
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
            'data-tone': tone,
            ...element.attributes,
            ...element.events,
            className: cx(
                styles.Radio,
                element.className,
                ...layoutSpaceClasses(classes, { p, pt, pr, pb, pl, m, mt, mr, mb, ml }),
                ...radiusClasses(classes, { r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR }),
                ...classes.value('grow', grow),
                className,
            ),
            style: element.style,
            ...stateProps(state, Boolean(inputProps.checked) && 'active', Boolean(invalid && invalid !== 'false') && 'error', isDisabled && 'disabled'),
        },
        effects: element.effects,
        input: { ref, id, type: 'radio' as const, className: styles.Input, ...inputProps },
    };
}
