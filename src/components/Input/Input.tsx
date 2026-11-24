'use client';

import { useLayoutEffect, useRef } from 'react';
import { useMergedRefs, type WithRef } from '../../core';
import { useFormField } from '../../core/Form';
import { FieldFrame } from '../Field';
import { InputControl } from './InputControl/InputControl';
import { InputActions } from './InputActions/InputActions';
import { InputCalendar } from './InputCalendar/InputCalendar';
import { InputOverflow } from './InputOverflow/InputOverflow';
import { useInput } from './Input.model';
import type { InputProps } from './Input.types';

export type { InputProps } from './Input.types';

export function Input(props: WithRef<InputProps, HTMLInputElement>) {
  const field = useFormField<unknown>(props.name);
  const nativeFile = useRef<HTMLInputElement | null>(null);
  const fileRef = useMergedRefs(nativeFile, props.ref);
  const files = props.type === 'file' && props.value === undefined && Array.isArray(field?.value)
    ? field.value as File[] : undefined;
  const fileBound = Boolean(field && files);
  const bound = props.type !== 'file' && field && props.value === undefined && typeof field.value === 'string';
  // FileList cannot be assigned from a React value. Clear an obsolete native
  // selection after reset/acknowledge; the controller retains actual File objects.
  useLayoutEffect(() => {
    const node = nativeFile.current;
    if (!fileBound || !node || !files) return;
    const selected = Array.from(node.files ?? []);
    if (selected.some(file => !files.includes(file))) node.value = '';
  });
  let options = props;
  if (fileBound && field) {
    options = {
      ...props, ref: fileRef, value: undefined, defaultValue: undefined, seed: undefined,
      disabled: props.disabled || field.disabled, error: props.error ?? field.error,
      onChange: event => {
        props.onChange?.(event);
        if (!event.defaultPrevented && !field.disabled) field.change(Array.from(event.currentTarget.files ?? []));
      },
    };
  } else if (bound) {
    options = {
    ...props,
    value: field.value as string,
    disabled: props.disabled || field.disabled,
    error: props.error ?? field.error,
    onValueChange: (value, details) => {
      field.change(value);
      props.onValueChange?.(value, details);
    },
    };
  }
  const input = useInput(options);

  return (
    <FieldFrame layout={input.layout} label={input.label} feedback={input.feedback}>
      <InputControl
          control={input.control}
          decoration={input.decoration}
          start={props.slots?.start}
          end={props.slots?.end}
      >
        <InputActions actions={input.actions} />
      </InputControl>

      <InputCalendar calendar={input.calendar} />

      <InputOverflow tooltip={input.tooltip} />
    </FieldFrame>
  );
}
