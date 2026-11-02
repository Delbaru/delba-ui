import { useState } from 'react';
import * as datePicker from './date-picker';
import * as phoneMask from './phone-mask';
import * as timeMask from './time-mask';

interface UseInputValuesOptions {
  isPhone: boolean;
  isTime: boolean;
  isDate: boolean;
  value?: string | number | readonly string[];
  defaultValue: string;
  phoneFormat: phoneMask.PhoneFormat;
}

/** Adapts the three masked field types to their controlled and uncontrolled storage models. */
export function useInputValues({
  isPhone,
  isTime,
  isDate,
  value,
  defaultValue,
  phoneFormat,
}: UseInputValuesOptions) {
  const isPhoneControlled = isPhone && value !== undefined;
  const isTimeControlled = isTime && value !== undefined;
  const isDateControlled = isDate && value !== undefined;

  const [phoneUncontrolled, setPhoneUncontrolled] = useState(() => {
    if (!isPhone || value !== undefined || !defaultValue) return phoneMask.emptyValue(phoneFormat);
    return phoneMask.formatPhone(defaultValue, phoneFormat) || phoneMask.emptyValue(phoneFormat);
  });
  const [timeUncontrolled, setTimeUncontrolled] = useState(() =>
    isTime && value === undefined ? timeMask.normalize(defaultValue) : '',
  );
  const [dateUncontrolled, setDateUncontrolled] = useState(() =>
    isDate && value === undefined ? datePicker.normalizeDisplayValue(defaultValue) : '',
  );

  const phoneDisplayValue = isPhone
    ? isPhoneControlled
      ? phoneMask.formatPhone(String(value), phoneFormat) || phoneMask.emptyValue(phoneFormat)
      : phoneUncontrolled
    : undefined;
  const timeDisplayValue = isTime
    ? isTimeControlled
      ? timeMask.normalize(String(value))
      : timeUncontrolled
    : undefined;
  const dateDisplayValue = isDate
    ? isDateControlled
      ? datePicker.normalizeDisplayValue(String(value))
      : dateUncontrolled
    : undefined;

  return {
    isPhoneControlled,
    isTimeControlled,
    isDateControlled,
    phoneUncontrolled,
    setPhoneUncontrolled,
    timeUncontrolled,
    setTimeUncontrolled,
    dateUncontrolled,
    setDateUncontrolled,
    phoneDisplayValue,
    phoneDisplayValueWithoutPrefix: isPhone
      ? phoneMask.stripPrefix(phoneDisplayValue ?? '', phoneFormat)
      : undefined,
    timeDisplayValue,
    dateDisplayValue,
  };
}
