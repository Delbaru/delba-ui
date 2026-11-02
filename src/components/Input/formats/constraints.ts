import * as datePicker from '../../../core/fields/date';
import * as timeMask from './time';
import { formatUiMessage, UI_MESSAGES } from '../../../core/base/messages';

export function normalizeConstraintValue(value: string | number | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseMinutesSinceMidnight(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function validateDateBounds(
  value: string,
  minValue?: string,
  maxValue?: string,
): string | undefined {
  const date = datePicker.parseValue(value);
  if (!date) return undefined;

  const minimum = minValue ? datePicker.parseValue(minValue) : null;
  if (minimum && datePicker.isBeforeDay(date, minimum)) {
    return formatUiMessage(UI_MESSAGES.validation.dateMin, {
      value: datePicker.formatDisplay(minimum),
    });
  }

  const maximum = maxValue ? datePicker.parseValue(maxValue) : null;
  if (maximum && datePicker.isAfterDay(date, maximum)) {
    return formatUiMessage(UI_MESSAGES.validation.dateMax, {
      value: datePicker.formatDisplay(maximum),
    });
  }

  return undefined;
}

export function validateTimeBounds(
  value: string,
  minValue?: string,
  maxValue?: string,
): string | undefined {
  const minutes = parseMinutesSinceMidnight(value);
  if (minutes === null) return undefined;

  const normalizedMin = minValue ? timeMask.normalize(minValue) : '';
  const minMinutes = normalizedMin ? parseMinutesSinceMidnight(normalizedMin) : null;
  if (minMinutes !== null && minutes < minMinutes) {
    return formatUiMessage(UI_MESSAGES.validation.timeMin, { value: normalizedMin });
  }

  const normalizedMax = maxValue ? timeMask.normalize(maxValue) : '';
  const maxMinutes = normalizedMax ? parseMinutesSinceMidnight(normalizedMax) : null;
  if (maxMinutes !== null && minutes > maxMinutes) {
    return formatUiMessage(UI_MESSAGES.validation.timeMax, { value: normalizedMax });
  }

  return undefined;
}
