'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type React from 'react';
import styles from './Checkbox.module.scss';
import { assetUrl, boxLayout, createLayoutClasses, cx, splitBoxLayout, splitRootDomProps, stateLinkProps, stateProps, useMergedRefs, type BoxLayoutProps, type ComponentStateValue, type ResponsiveValue, type StateLinkInput, type WithRef } from '../../core';
import { Icon } from '../Icon';
import { Flex } from '../Flex';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { composeInteractionHandlers, composeEventHandlers } from '../../core/composeEventHandlers';
import { useFormReset } from '../../core/useFormReset';

import checkIcon from '../../../assets/icons/ui/check/succsess_check_black.svg';

const c = createLayoutClasses(styles);

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, Omit<BoxLayoutProps, 'aspectRatio'>, SharedMotionProps {
    /** Show the decorative checkbox; the native input and label are preserved. */
    indicator?: boolean;
    style?: CSSProperties;
    children?: React.ReactNode;
    indeterminate?: boolean;
    /** Vertical indicator alignment; start follows the first label line. */
    alignItems?: 'center' | 'start';
    gap?: ResponsiveValue<number>;
    state?: ComponentStateValue;
    /** Indicator size in theme units; default 24. */
    size?: ResponsiveValue<number>;
    /** Checkmark size in theme units; default 16. */
    iconSize?: ResponsiveValue<number>;
    'data-error'?: string;
    'data-point-events'?: string;
    linkState?: StateLinkInput;
}

export function Checkbox({
    ref,
    className = '',
    style,
    children,
    indeterminate = false,
    alignItems = 'center',
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
    state, linkState,
    size,
    iconSize,
    indicator = true,
    'data-point-events': dataPointEvents,
    ...props
}: WithRef<CheckboxProps, HTMLInputElement>) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const { box, rest } = splitBoxLayout(props);
    const layout = boxLayout(c, box);
    const { rootProps, elementProps } = splitRootDomProps(rest as typeof rest & Record<string, unknown>);
    const { 'data-error': dataError, ...inputProps } = elementProps;
    const isDisabled = Boolean(inputProps.disabled);
    const [uncontrolledChecked, setUncontrolledChecked] = useState(Boolean(inputProps.defaultChecked));
    const isChecked = inputProps.checked ?? uncontrolledChecked;
    const isPassiveReadOnly = Boolean(inputProps.readOnly)
        && !inputProps.onChange
        && !onClick
        && !onFocus
        && !onBlur
        && !onMouseEnter
        && !onMouseLeave
        && !linkState;
    const rootDataPointEvents = dataPointEvents ?? (isPassiveReadOnly ? 'none' : undefined);
    const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });
    const inputRef = useRef<HTMLInputElement | null>(null);
    const setInputRef = useMergedRefs(inputRef, ref);
    useFormReset(inputRef, undefined, () => {
        if (inputProps.checked === undefined) setUncontrolledChecked(Boolean(inputProps.defaultChecked));
    });

    useEffect(() => {
        if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <label
            ref={setMotionNode}
            htmlFor={id}
            data-point-events={rootDataPointEvents}
            {...(rootProps as React.LabelHTMLAttributes<HTMLLabelElement>)}
            {...revealAttrs}
            {...(!isDisabled ? stateLinkProps(linkState, composeInteractionHandlers(motionHandlers, { onMouseEnter, onMouseLeave, onClick, onFocus, onBlur })) : {})}
            className={cx(styles.Checkbox, ...layout, className)}
            style={{ ...(motionStyle ?? null), ...style }}
            {...stateProps(state, isChecked && 'active', dataError && 'error', isDisabled && 'disabled')}
        >
            <Flex
                gap={gap ?? [8, 8, 8]}
                align={[alignItems, alignItems, alignItems]}
                grow={[1, 1, 1]}
                minW={[0, 0, 0]}
            >
                <input
                    ref={setInputRef}
                    id={id}
                    type="checkbox"
                    className={styles.Input}
                    {...inputProps}
                    onChange={composeEventHandlers(inputProps.onChange, (event) => {
                        if (inputProps.checked === undefined) setUncontrolledChecked(event.currentTarget.checked);
                    })}
                />

                {indicator && <Flex
                    className={styles.Box}
                    w={size ?? [24, 24, 24]}
                    h={size ?? [24, 24, 24]}
                    r={[8, 8, 8]}
                    align={['center', 'center', 'center']}
                    justify={['center', 'center', 'center']}
                    border={['calc(1 * var(--rpx)) solid var(--checkbox-box-border, var(--text-muted))', 'calc(1 * var(--rpx)) solid var(--checkbox-box-border, var(--text-muted))', 'calc(1 * var(--rpx)) solid var(--checkbox-box-border, var(--text-muted))']}
                    aria-hidden
                    {...stateProps(isChecked && 'active')}
                >
                    <Icon
                        src={assetUrl(checkIcon)}
                        w={iconSize ?? [16, 16, 16]}
                        h={iconSize ?? [16, 16, 16]}
                        fill='var(--white-100)'
                        className={styles.icon}
                        aria-hidden
                    />
                </Flex>}

                {children}
            </Flex>
        </label>
    );
}
