'use client';

import type { WithRef } from '../../core';
import { FieldFrame } from '../Field';
import { InputControl } from './InputControl/InputControl';
import { InputActions } from './InputActions/InputActions';
import { InputCalendar } from './InputCalendar/InputCalendar';
import { InputOverflow } from './InputOverflow/InputOverflow';
import { useInput } from './Input.model';
import type { InputProps } from './Input.types';

export type { InputProps } from './Input.types';

export function Input(props: WithRef<InputProps, HTMLInputElement>) {
  const input = useInput(props);

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
