import { UI_MESSAGES } from '../../../core/base/messages';

/**
 * Маска времени HH:MM в 24-часовом формате.
 *
 * Input.tsx хранит только состояние и JSX,
 * а нормализация и валидация изолированы здесь.
 */

const DEFAULT_PLACEHOLDER = '00:00';

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MASK_TEMPLATE = '__:__';

function normalizeDigits(rawValue: string): string[] {
  const inputDigits = rawValue.replace(/\D/g, '').slice(0, 4);
  const timeDigits: string[] = [];

  for (const digit of inputDigits) {
    const position = timeDigits.length;

    if (position === 0 && digit > '2') {
      timeDigits.push('0', digit);
      continue;
    }

    if (position === 1 && timeDigits[0] === '2' && digit > '3') continue;
    if (position === 2 && digit > '5') continue;

    timeDigits.push(digit);
    if (timeDigits.length === 4) break;
  }

  return timeDigits;
}

function formatDigits(digits: readonly string[]): string {
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits.join('');

  return `${digits.slice(0, 2).join('')}:${digits.slice(2).join('')}`;
}

export function normalize(rawValue: string): string {
  return formatDigits(normalizeDigits(rawValue));
}

export function validate(rawValue: string): string | undefined {
  const value = normalize(rawValue);
  if (value && !TIME_REGEX.test(value)) return UI_MESSAGES.validation.time;
  return undefined;
}

export const getMaskDisplay = (raw: string): string => {
  const value = normalize(raw);
  let pointer = 0;

  return Array.from(MASK_TEMPLATE, (templateChar) => {
    const nextValueChar = value[pointer];

    if (templateChar === ':') {
      if (nextValueChar === ':') pointer += 1;
      return templateChar;
    }

    if (nextValueChar && nextValueChar !== ':') {
      pointer += 1;
      return nextValueChar;
    }

    return templateChar;
  }).join('');
};

export function getMaskSuffix(rawValue: string): string {
  const normalizedValue = normalize(rawValue);
  return getMaskDisplay(normalizedValue).slice(normalizedValue.length);
}

function countDigitsBefore(value: string, offset: number): number {
  return value.slice(0, offset).replace(/\D/g, '').length;
}

function mapDigitOffsetToTime(normalizedValue: string, digitCount: number): number {
  return digitCount <= 2 ? digitCount : Math.min(normalizedValue.length, digitCount + 1);
}

/** Normalizes native edits and maps both selection edges across the inserted colon. */
export function normalizeEdit(
  rawValue: string,
  selectionStart: number | null,
  selectionEnd: number | null,
) {
  const value = normalize(rawValue);
  const mapOffset = (offset: number | null) =>
    offset === null ? null : mapDigitOffsetToTime(value, countDigitsBefore(rawValue, offset));

  return {
    value,
    selectionStart: mapOffset(selectionStart),
    selectionEnd: mapOffset(selectionEnd),
  };
}

export const placeholder = DEFAULT_PLACEHOLDER;
export const maxLength = 5;
