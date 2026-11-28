import { UI_MESSAGES } from '../base/messages';
import { calendar } from '../Calendar/Calendar';

/** The date field's display format and validation. */

const DISPLAY_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export const maxLength = 10;

/** Reads either the field's display value or the browser's ISO date value. */
export function parseValue(value: string): string | null {
  const match = DISPLAY_DATE.exec(value.trim());
  if (!match) return calendar.parseDate(value);

  const [, day, month, year] = match;
  return calendar.parseDate(`${year}-${month}-${day}`);
}

export function formatDisplay(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

export function normalizeDisplayValue(value: string): string {
  if (!value.trim()) return '';

  const date = parseValue(value);
  return date ? formatDisplay(date) : value;
}

export function validate(value: string): string | undefined {
  if (value && !parseValue(value)) return UI_MESSAGES.validation.date;
  return undefined;
}
