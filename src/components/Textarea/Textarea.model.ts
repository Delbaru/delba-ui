'use client';

import { useMemo } from 'react';
import {
  createLayoutClasses,
  cx,
  fieldHelperPaddingLeft,
  fieldLayoutClasses,
  fieldRootLayoutClasses,
  resolveFieldLayout,
  splitBoxLayout,
  stateLinkProps,
  stateProps,
  type WithRef,
} from '../../core';
import { useSharedMotion } from '../../hooks/useSharedMotion';
import { useField, useFieldFeedback } from '../Field';
import { textareaConfig } from './Textarea.config';
import type { TextareaProps } from './Textarea.types';
import styles from './Textarea.module.scss';

const classes = createLayoutClasses(styles, { local: { h: 'height' } });

export function useTextarea(props: WithRef<TextareaProps, HTMLTextAreaElement>) {
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
    placeholderColor,
    seed,
    loading = false,
    label,
    labelColor,
    comment,
    rows = 3,
    length,
    showCount,
    countPlacement = 'inside',
    error,
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
  const motion = useSharedMotion({ animate, perspective3d, parallax });
  const layout = resolveFieldLayout({ ...box, variant, size, color, placeholderColor });
  const feedback = useFieldFeedback({
    id: field.id,
    error: field.validation.message,
    comment,
    placement: 'inside',
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
      ref: motion.setMotionNode,
      collapse,
      className: cx(styles.Textarea, styles.TextareaWrapper, ...fieldRootLayoutClasses(classes, box), className),
      style: { ...motion.motionStyle, ...style },
      ...motion.revealAttrs,
      ...stateLinkProps(linkState, motion.motionHandlers),
      'data-point-events': pointEvents,
    },
    label: label ? { text: label, color: labelColor, htmlFor: field.id, required } : undefined,
    control: {
      appearance: {
        className: cx(
          ...fieldLayoutClasses(classes, layout),
          ...classes.value('grow', box.grow),
          fieldClassName,
        ),
        ...stateProps(
          state,
          field.validation.message && 'error',
          field.focus.active && 'active',
          field.value.hasValue && 'filled',
        ),
      },
      focus: field.focus.request,
      loading,
      rows,
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
        onBlur(event: React.FocusEvent<HTMLTextAreaElement>) {
          field.events.onBlur(event);
          field.focus.leave(false);
        },
      },
      ref: field.control.ref,
    },
    comment: feedback.below.comment,
    counter,
  };
}
