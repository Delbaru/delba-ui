import { EMAIL_REGEX } from '../../../validation';
import * as datePicker from './date-picker';
import * as phoneMask from './phone-mask';
import * as timeMask from './time-mask';
import { validateDateBounds, validateTimeBounds } from './input-constraints';

const INVALID_EMAIL = 'Неверный формат email';

export interface InputValidationOptions {
  type: string;
  phoneFormat: phoneMask.PhoneFormat;
  min?: string;
  max?: string;
  validate?: (value: string) => string | undefined;
}

export function validateInputValue(value: string, options: InputValidationOptions) {
  const { type, phoneFormat, min, max, validate } = options;

  if (type === 'email' && value && !EMAIL_REGEX.test(value)) return INVALID_EMAIL;
  if (type === 'tel' && value) return phoneMask.validate(value, phoneFormat);

  if (type === 'time') {
    const timeError = timeMask.validate(value);
    if (timeError) return timeError;
    return validateTimeBounds(value, min, max) ?? validate?.(value);
  }

  if (type === 'data' || type === 'date') {
    const dateError = datePicker.validate(value);
    if (dateError) return dateError;
    return validateDateBounds(value, min, max) ?? validate?.(value);
  }

  return validate?.(value);
}
