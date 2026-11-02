'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { FocusEvent, MouseEvent } from 'react';
import { stateLinkProps, useMergedRefs, type WithRef } from '../../core';
import { useSharedMotion } from '../../hooks/useSharedMotion';
import { useField, useFieldFeedback, focusContains } from '../Field';
import { useDatePicker } from './InputCalendar/InputCalendar';
import { inputConfig } from './Input.config';
import { inputModes } from './Input.modes';
import { useInputActions } from './InputActions/InputActions';
import { useInputOverflow } from './InputOverflow/InputOverflow';
import type { InputProps } from './Input.types';
import styles from './Input.module.scss';

/** Connects one field engine to Input's view and optional calendar. */
export function useInput(props: WithRef<InputProps, HTMLInputElement>) {
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
  const motion = useSharedMotion(props);
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
    calendar,
  });
  const overflow = useInputOverflow({ enabled: mode.inputType !== 'password', active });
  const inputRef = useMergedRefs(field.control.ref, overflow.setInputRef);
  const anchorRef = useMergedRefs(rowRef, overflow.setAnchorRef);
  const frameRef = useMergedRefs(rootRef, motion.setMotionNode);
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
    if (props.disabled) return;
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
      if (mode.calendar) calendar.open();
    },
    onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      field.events.onKeyDown(event);
      if (!event.defaultPrevented) calendar.keyboard.handle(event);
    },
  };

  return {
    layout: {
      ...appearance.root,
      ...motion.revealAttrs,
      ...stateLinkProps(props.linkState, motion.motionHandlers),
      style: { ...motion.motionStyle, ...props.style },
      ref: frameRef,
      'data-point-events': props['data-point-events'],
    },
    label: appearance.label ? { ...appearance.label, htmlFor: field.id } : undefined,
    feedback: feedback.below,
    control: {
      inputProps,
      inputRef,
      rowRef: anchorRef,
      appearance: appearance.control,
      onClick: activate,
      onBlur: leave,
      onMouseEnter: overflow.show,
      onMouseLeave: overflow.hide,
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
    tooltip: overflow,
  };
}
