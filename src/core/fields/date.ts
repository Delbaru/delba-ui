import { UI_MESSAGES } from '../base/messages';

/** Pure date parsing, range rules, calendar navigation, and visible-day generation for Input. */

const DISPLAY_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CALENDAR_DAY_COUNT = 42;

export const maxLength = 10;

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function createDateIfValid(year: number, monthNumber: number, dayNumber: number): Date | null {
  const date = new Date(year, monthNumber - 1, dayNumber);
  const matchesParts =
    date.getFullYear() === year &&
    date.getMonth() === monthNumber - 1 &&
    date.getDate() === dayNumber;

  return Number.isNaN(date.getTime()) || !matchesParts ? null : date;
}

function parseDisplayDate(value: string): Date | null {
  const match = DISPLAY_DATE.exec(value.trim());
  if (!match) return null;

  const [, day, month, year] = match;
  return createDateIfValid(Number(year), Number(month), Number(day));
}

function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  return createDateIfValid(Number(year), Number(month), Number(day));
}

/** Reads either the field's display value or the browser's ISO date value. */
export function parseValue(value: string): Date | null {
  return parseDisplayDate(value) ?? parseIsoDate(value);
}

export function formatDisplay(date: Date): string {
  const day = padDatePart(date.getDate());
  const month = padDatePart(date.getMonth() + 1);
  return `${day}.${month}.${date.getFullYear()}`;
}

/** Formats a local calendar date without parsing it through UTC. */
export function formatIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  return `${year}-${month}-${day}`;
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

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function isSameDay(left: Date | null, right: Date): boolean {
  return Boolean(
    left &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate(),
  );
}

export function compareDays(left: Date, right: Date): number {
  const yearDifference = left.getFullYear() - right.getFullYear();
  if (yearDifference) return yearDifference;

  const monthDifference = left.getMonth() - right.getMonth();
  if (monthDifference) return monthDifference;

  return left.getDate() - right.getDate();
}

export function isBeforeDay(left: Date, right: Date): boolean {
  return compareDays(left, right) < 0;
}

export function isAfterDay(left: Date, right: Date): boolean {
  return compareDays(left, right) > 0;
}

/** The date is allowed when it lies on or between either supplied bound. */
export function isWithinBounds(date: Date, minDate: Date | null, maxDate: Date | null): boolean {
  return (!minDate || !isBeforeDay(date, minDate)) && (!maxDate || !isAfterDay(date, maxDate));
}

/** Opens on the selected month, otherwise today clamped to the provided date range. */
export function resolveOpeningMonth(
  value?: string,
  minValue?: string,
  maxValue?: string,
  today = new Date(),
): Date {
  const selectedDate = parseValue(value ?? '');
  if (selectedDate) return getMonthStart(selectedDate);

  const minDate = parseValue(minValue ?? '');
  if (minDate && isBeforeDay(today, minDate)) return getMonthStart(minDate);

  const maxDate = parseValue(maxValue ?? '');
  if (maxDate && isAfterDay(today, maxDate)) return getMonthStart(maxDate);

  return getMonthStart(today);
}

export function isWeekend(date: Date): boolean {
  const weekday = date.getDay();
  return weekday === 0 || weekday === 6;
}

/** Generates six Monday-first weeks so the calendar surface keeps a stable height. */
export function buildCalendarDays(month: Date): Date[] {
  const monthStart = getMonthStart(month);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const firstVisibleDay = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 - mondayOffset,
  );

  return Array.from(
    { length: CALENDAR_DAY_COUNT },
    (_, index) =>
      new Date(
        firstVisibleDay.getFullYear(),
        firstVisibleDay.getMonth(),
        firstVisibleDay.getDate() + index,
      ),
  );
}
