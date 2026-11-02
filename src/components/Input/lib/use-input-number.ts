import { useCallback } from 'react';
import type {
  ChangeEvent,
  InputHTMLAttributes,
  KeyboardEvent,
  RefObject,
  SetStateAction,
} from 'react';
import type { FieldValueChangeHandler } from '../../../core';
import { calculateNumberStep, isNumberCharacterAllowed } from './number-input';

interface UseInputNumberOptions {
  enabled: boolean;
  disabled?: boolean;
  readOnly: boolean;
  min?: string | number;
  max?: string | number;
  options: readonly number[];
  value: string;
  valueProp?: InputHTMLAttributes<HTMLInputElement>['value'];
  field: RefObject<HTMLInputElement | null>;
  setUncontrolledValue: (value: string) => void;
  onValueChange?: FieldValueChangeHandler<HTMLInputElement>;
  setInternalError: (next: SetStateAction<string | undefined>) => void;
  validateValue: (value: string) => string | undefined;
}

/** Owns number-specific typing policy and step actions, including controlled field commits. */
export function useInputNumber({
  enabled,
  disabled,
  readOnly,
  min: minProp,
  max: maxProp,
  options,
  value,
  valueProp,
  field,
  setUncontrolledValue,
  onValueChange,
  setInternalError,
  validateValue,
}: UseInputNumberOptions) {
  const min = minProp === undefined ? undefined : Number(minProp);
  const max = maxProp === undefined ? undefined : Number(maxProp);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!enabled || min === undefined || Number.isNaN(min) || min < 0) return false;
      const rawValue = event.target.value;
      if (!rawValue.trim().startsWith('-')) return false;

      const nextValue = rawValue.replace(/^-+/, '');
      const normalizedValue = nextValue === '-' ? '' : nextValue;
      if (valueProp === undefined) setUncontrolledValue(normalizedValue);
      event.target.value = normalizedValue;
      onValueChange?.(normalizedValue, { reason: 'input', event });
      setInternalError(validateValue(normalizedValue));
      return true;
    },
    [enabled, min, onValueChange, setInternalError, setUncontrolledValue, validateValue, valueProp],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (
        !enabled ||
        disabled ||
        event.key.length !== 1 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }
      if (!isNumberCharacterAllowed(event.key, min)) event.preventDefault();
    },
    [disabled, enabled, min],
  );

  const step = useCallback(
    (delta: number) => {
      if (!enabled || disabled || readOnly) return;

      const rawValue = field.current?.value ?? value;
      const nextValue = calculateNumberStep({
        currentValue: rawValue,
        options,
        delta,
        min,
        max,
        field: field.current,
      });
      if (nextValue === undefined) return;

      const nextValueString = String(nextValue);
      if (nextValueString === rawValue) return;
      if (field.current && valueProp === undefined) field.current.value = nextValueString;
      if (valueProp === undefined) setUncontrolledValue(nextValueString);
      onValueChange?.(nextValueString, { reason: 'step', event: null });
      setInternalError(validateValue(nextValueString));
    },
    [
      disabled,
      enabled,
      field,
      max,
      min,
      onValueChange,
      options,
      readOnly,
      setInternalError,
      setUncontrolledValue,
      validateValue,
      value,
      valueProp,
    ],
  );

  return { handleChange, handleKeyDown, step };
}
