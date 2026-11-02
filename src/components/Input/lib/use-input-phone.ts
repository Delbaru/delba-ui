import { useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent, FocusEvent, RefObject } from 'react';
import type { FieldValueChangeHandler } from '../../../core';
import * as phoneMask from './phone-mask';

interface UseInputPhoneOptions {
  enabled: boolean;
  controlled: boolean;
  format: phoneMask.PhoneFormat;
  field: RefObject<HTMLInputElement | null>;
  setUncontrolledValue: (value: string) => void;
  onValueChange?: FieldValueChangeHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  setInternalError: React.Dispatch<React.SetStateAction<string | undefined>>;
  validateValue: (value: string) => string | undefined;
}

/** Owns phone-specific edit normalization, caret restoration and blur validation. */
export function useInputPhone({
  enabled,
  controlled,
  format,
  field,
  setUncontrolledValue,
  onValueChange,
  onBlur,
  setInternalError,
  validateValue,
}: UseInputPhoneOptions) {
  const pendingCaret = useRef<{ view: Window; frame: number } | null>(null);

  useEffect(
    () => () => {
      if (pendingCaret.current) {
        pendingCaret.current.view.cancelAnimationFrame(pendingCaret.current.frame);
      }
    },
    [],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!enabled) return false;
      const input = event.currentTarget;
      const next = phoneMask.normalizePhoneInput(
        input.value,
        input.selectionStart,
        input.selectionEnd,
        format,
      );
      const direction = input.selectionDirection;
      if (!controlled) setUncontrolledValue(next.formatted);
      onValueChange?.(next.formatted, { reason: 'input', event });

      const view = input.ownerDocument.defaultView;
      if (view && next.selectionStart !== null && next.selectionEnd !== null) {
        if (pendingCaret.current) {
          pendingCaret.current.view.cancelAnimationFrame(pendingCaret.current.frame);
        }
        const start = next.selectionStart;
        const end = next.selectionEnd;
        pendingCaret.current = {
          view,
          frame: view.requestAnimationFrame(() => {
            pendingCaret.current = null;
            if (field.current === input && input.value === next.displayValue) {
              input.setSelectionRange(start, end, direction ?? 'none');
            }
          }),
        };
      }

      const nextError = validateValue(next.formatted);
      setInternalError((currentError) => (currentError ? nextError : undefined));
      return true;
    },
    [
      enabled,
      field,
      format,
      onValueChange,
      setInternalError,
      setUncontrolledValue,
      controlled,
      validateValue,
    ],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!enabled) return false;
      const formatted = phoneMask.formatPhone(event.target.value, format);
      setInternalError(validateValue(formatted));
      onBlur?.(event);
      return true;
    },
    [enabled, format, onBlur, setInternalError, validateValue],
  );

  return { handleChange, handleBlur };
}
