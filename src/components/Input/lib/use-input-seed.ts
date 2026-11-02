import { useCallback } from 'react';
import type { FocusEvent } from 'react';
import { resolveSeedField } from '../../../core/base/seed';
import type { FieldValueChangeDetails } from '../../../core';

interface UseInputSeedOptions {
  seed?: string;
  value: string;
  placeholder?: string;
  readOnly: boolean;
  commitValue: (value: string, details: FieldValueChangeDetails<HTMLInputElement>) => void;
}

/** Owns the seed's display state and its focus/blur commits as one field behavior. */
export function useInputSeed({
  seed,
  value,
  placeholder,
  readOnly,
  commitValue,
}: UseInputSeedOptions) {
  const field = resolveSeedField({ seed, value, placeholder });

  const activate = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!readOnly && field.focusValue !== undefined) {
        commitValue(field.focusValue, { reason: 'seed', event });
      }
    },
    [commitValue, field.focusValue, readOnly],
  );

  const restore = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!readOnly && field.blurValue !== undefined) {
        commitValue(field.blurValue, { reason: 'seed', event });
        return field.blurValue;
      }
      return undefined;
    },
    [commitValue, field.blurValue, readOnly],
  );

  return { field, activate, restore };
}
