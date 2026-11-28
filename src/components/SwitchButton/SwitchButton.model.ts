'use client';

import { useId } from 'react';
import { composeEventHandlers, cx, createLayoutClasses, stateProps, layoutSpaceClasses, type WithRef } from '#core';
import { useElement } from '#core/Element';
import { useFormField } from '#core/Form';
import { switchButtonDefaults } from './SwitchButton.config';
import type { SwitchButtonProps } from './SwitchButton.types';
import styles from './SwitchButton.module.scss';

const classes = createLayoutClasses(styles);

export function useSwitchButton({
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
    }, { cancelable: true }),
  } : props;
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
      ...element.attributes,
      ...element.events,
      className: cx(
        styles.SwitchButton,
        element.className,
        ...layoutSpaceClasses(classes, { p, pt, pr, pb, pl, m, mt, mr, mb, ml }),
        ...classes.value('grow', grow),
        className,
      ),
      style: element.style,
      ...stateProps(state, Boolean(inputProps.checked) && 'active', Boolean(invalid && invalid !== 'false') && 'error', isDisabled && 'disabled'),
    },
    effects: element.effects,
    input: { ref, id, type: 'checkbox' as const, className: styles.Input, ...inputProps },
  };
}
