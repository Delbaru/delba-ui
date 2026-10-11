import type { ChangeEvent, FocusEvent } from 'react';

export type FieldValueChangeReason = 'input' | 'format' | 'seed' | 'step' | 'pick' | 'country';

/** Причина изменения модели; событие отсутствует при выборе даты или шаге числа. */
export interface FieldValueChangeDetails<E extends HTMLInputElement | HTMLTextAreaElement> {
  reason: FieldValueChangeReason;
  event: ChangeEvent<E> | FocusEvent<E> | null;
}

export type FieldValueChangeHandler<E extends HTMLInputElement | HTMLTextAreaElement> = (
  value: string,
  details: FieldValueChangeDetails<E>,
) => void;
