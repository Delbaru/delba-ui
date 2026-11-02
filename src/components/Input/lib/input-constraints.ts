import * as datePicker from './date-picker';
import * as timeMask from './time-mask';

export const DEFAULT_DATE_MIN_ERROR = 'Дата не может быть раньше';
export const DEFAULT_DATE_MAX_ERROR = 'Дата не может быть позже';
export const DEFAULT_TIME_MIN_ERROR = 'Время не может быть раньше';
export const DEFAULT_TIME_MAX_ERROR = 'Время не может быть позже';

export function normalizeConstraintValue(value: string | number | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function parseTimeValue(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function compareTimeValues(left: string, right: string) {
  const parsedLeft = parseTimeValue(left);
  const parsedRight = parseTimeValue(right);
  if (!parsedLeft || !parsedRight) return 0;
  return parsedLeft.hours * 60 + parsedLeft.minutes - parsedRight.hours * 60 - parsedRight.minutes;
}

export function validateDateBounds(value: string, minValue?: string, maxValue?: string) {
  const parsedValue = datePicker.parseValue(value);
  if (!parsedValue) return undefined;

  const parsedMin = minValue ? datePicker.parseValue(minValue) : null;
  if (parsedMin && datePicker.isBeforeDay(parsedValue, parsedMin)) {
    return `${DEFAULT_DATE_MIN_ERROR} ${datePicker.formatDisplay(parsedMin)}`;
  }

  const parsedMax = maxValue ? datePicker.parseValue(maxValue) : null;
  if (parsedMax && datePicker.isAfterDay(parsedValue, parsedMax)) {
    return `${DEFAULT_DATE_MAX_ERROR} ${datePicker.formatDisplay(parsedMax)}`;
  }

  return undefined;
}

export function validateTimeBounds(value: string, minValue?: string, maxValue?: string) {
  if (!parseTimeValue(value)) return undefined;

  const normalizedMin = minValue ? timeMask.normalize(minValue) : '';
  if (
    normalizedMin &&
    parseTimeValue(normalizedMin) &&
    compareTimeValues(value, normalizedMin) < 0
  ) {
    return `${DEFAULT_TIME_MIN_ERROR} ${normalizedMin}`;
  }

  const normalizedMax = maxValue ? timeMask.normalize(maxValue) : '';
  if (
    normalizedMax &&
    parseTimeValue(normalizedMax) &&
    compareTimeValues(value, normalizedMax) > 0
  ) {
    return `${DEFAULT_TIME_MAX_ERROR} ${normalizedMax}`;
  }

  return undefined;
}

function countTimeDigitsBeforeCursor(value: string, cursor: number) {
  return value.slice(0, cursor).replace(/\D/g, '').length;
}

function mapTimeCursorPosition(normalizedValue: string, digitCount: number) {
  return digitCount <= 2 ? digitCount : Math.min(normalizedValue.length, digitCount + 1);
}

export function normalizeTimeValue(
  raw: string,
  cursor: number | null,
  selectionEnd: number | null,
) {
  const normalizedValue = timeMask.normalize(raw);
  const selectionStart =
    cursor === null
      ? null
      : mapTimeCursorPosition(normalizedValue, countTimeDigitsBeforeCursor(raw, cursor));
  const normalizedSelectionEnd =
    selectionEnd === null
      ? null
      : mapTimeCursorPosition(normalizedValue, countTimeDigitsBeforeCursor(raw, selectionEnd));

  return { normalizedValue, selectionStart, selectionEnd: normalizedSelectionEnd };
}
