'use client';

import { useId, type CSSProperties } from 'react';
import type React from 'react';
import styles from './SwitchButton.module.scss';
import { composeEventHandlers, cx, createLayoutClasses, stateProps, layoutSpaceClasses, stateLinkProps, type ComponentStateValue, type StateLinkInput, type LayoutSpaceProps, type ResponsiveValue, type GrowProps, type WithRef } from '../../core';
import { useFormField } from '../../core/Form';
import { Flex } from '../Flex';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';

const c = createLayoutClasses(styles);

export interface SwitchButtonProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>, LayoutSpaceProps, GrowProps, SharedMotionProps {
  style?: CSSProperties;
  children?: React.ReactNode;
  gap?: ResponsiveValue<number>;
  state?: ComponentStateValue;
  'data-point-events'?: string;
  linkState?: StateLinkInput;
}

export function SwitchButton({
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
  grow,
  perspective3d,
  parallax,
  animate,
  id: idProp,
  state,
  linkState,
  'data-point-events': dataPointEvents,
  ...props
}: WithRef<SwitchButtonProps, HTMLInputElement>) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const field = useFormField<boolean>(props.name);
  const bound = field && props.checked === undefined &&
    (typeof field.value === 'boolean' || field.value === undefined);
  const inputProps = bound ? {
    ...props,
    checked: Boolean(field.value),
    disabled: props.disabled || field.disabled,
    'aria-invalid': props['aria-invalid'] ?? Boolean(field.error),
    onChange: composeEventHandlers(props.onChange, event => {
      if (!props.readOnly && !field.disabled) field.change(event.currentTarget.checked);
    }),
  } : props;
  const isDisabled = Boolean(inputProps.disabled);
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });

  return (
    <label
      ref={setMotionNode}
      htmlFor={id}
      data-point-events={dataPointEvents}
      {...revealAttrs}
      {...(!isDisabled ? stateLinkProps(linkState, { ...motionHandlers }) : {})}
      className={cx(
          styles.SwitchButton,
          ...layoutSpaceClasses(c, { p, pt, pr, pb, pl, m, mt, mr, mb, ml }),
          ...c.value('grow', grow),
          className,
      )}
      style={{ ...(motionStyle ?? null), ...style }}
      {...stateProps(state, Boolean(inputProps.checked) && 'active', (inputProps['aria-invalid'] && inputProps['aria-invalid'] !== 'false') && 'error', isDisabled && 'disabled')}
    >
      <Flex gap={gap ?? [8, 8, 8]} align={["center", "center", "center"]}>
        <input ref={ref} id={id} type="checkbox" className={styles.Input} {...inputProps} />
        <Flex align={["center", "center", "center"]} className={styles.Track} aria-hidden>
          <span className={styles.Thumb} />
        </Flex>
        {children}
      </Flex>
    </label>
  );
}
