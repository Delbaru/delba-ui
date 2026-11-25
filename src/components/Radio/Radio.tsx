'use client';

import { useId, type CSSProperties } from 'react';
import type React from 'react';
import styles from './Radio.module.scss';
import { composeEventHandlers, cx, createLayoutClasses, stateProps, layoutSpaceClasses, radiusClasses, stateLinkProps, type ComponentStateValue, type StateLinkInput, type LayoutSpaceProps, type RadiusPropsShort, type ResponsiveValue, type GrowProps, type WithRef } from '../../core';
import { useFormField } from '../../core/Form';
import { Flex } from '../Flex';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';

const c = createLayoutClasses(styles);

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, LayoutSpaceProps, RadiusPropsShort, GrowProps, SharedMotionProps {
    /** Show the decorative radio indicator; the native input remains accessible. */
    indicator?: boolean;
    style?: CSSProperties;
    children?: React.ReactNode;
    gap?: ResponsiveValue<number>;
    state?: ComponentStateValue;
    // Цвет отмеченного состояния: success (зелёный, дефолт — «правильный ответ») / primary (синий — «выбран»).
    tone?: 'success' | 'primary';
    // Размер бокса в токенах (дефолт 20).
    size?: number;
    // Размер точки в токенах (дефолт 12).
    dotSize?: number;
    'data-point-events'?: string;
    linkState?: StateLinkInput;
}

export function Radio({
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
        }),
    } : props;
    const isDisabled = Boolean(inputProps.disabled);
    const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });

    return (
        <label
            ref={setMotionNode}
            htmlFor={id}
            data-point-events={dataPointEvents}
            data-tone={tone}
            {...revealAttrs}
            {...(!isDisabled ? stateLinkProps(linkState, { ...motionHandlers }) : {})}
            className={cx(
                styles.Radio,
                ...layoutSpaceClasses(c, { p, pt, pr, pb, pl, m, mt, mr, mb, ml }),
                ...radiusClasses(c, { r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR }),
                ...c.value('grow', grow),
                className,
            )}
            style={{ ...(motionStyle ?? null), ...(size != null ? { ['--radio-box']: size } : null), ...(dotSize != null ? { ['--radio-dot']: dotSize } : null), ...style }}
            {...stateProps(state, Boolean(inputProps.checked) && 'active', (inputProps['aria-invalid'] && inputProps['aria-invalid'] !== 'false') && 'error', isDisabled && 'disabled')}
        >
            <Flex gap={gap ?? [8, 8, 8]} align={['center', 'center', 'center']}>
                <input ref={ref} id={id} type="radio" className={styles.Input} {...inputProps} />
                {indicator && <Flex className={styles.Box} aria-hidden>
                    <span className={styles.Dot} />
                </Flex>}
                {children}
            </Flex>
        </label>
    );
}
