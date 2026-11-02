import { formatUiMessage, UI_MESSAGES } from '../base/messages';

/**
 * Маска телефона.
 *
 * Формат приезжает ПАРАМЕТРОМ, а не зашит: рядом с полем стоит выбор страны, и «+7» на десять
 * цифр верен ровно для одной из них. Дефолт остался российским, поэтому ни один call-site,
 * который формата не передаёт, не изменился.
 */

/** Что маска знает о номере выбранной страны. */
export interface PhoneFormat {
  /** Код страны с плюсом. Он же префикс, который поле рисует отдельным узлом слева. */
  dial: string;
  /**
   * Длина НАЦИОНАЛЬНОГО номера (без кода страны).
   *
   * Не задана — длина свободная: справочник стран у нас полный, а форматов мы знаем несколько,
   * и придуманная длина отвергала бы верные номера (§12 «не показывать факт, которого нет»).
   */
  digits?: number;
  /** Разбивка национального номера на группы; сумма равна `digits`. */
  groups?: number[];
  /** Образец номера или символы заполнителя (например, __________); длина равна `digits`. */
  sample?: string;
}

export interface PhoneMaskPart {
  text: string;
  dim?: boolean;
}

export const DEFAULT_PHONE_FORMAT: PhoneFormat = {
  dial: '+7',
  digits: 10,
  groups: [3, 3, 2, 2],
  sample: '9991234567',
};

// Предел E.164 — пятнадцать цифр вместе с кодом страны. Он и задаёт потолок у формата,
// длину которого мы не знаем.
const E164_DIGITS = 15;
// Самые короткие национальные номера в мире — четырёхзначные. Ниже этого «номер не дописан»
// верно для любой страны, выше — уже догадка о конкретной.
const MIN_UNKNOWN_DIGITS = 4;

const digitsOf = (value: string): string => (value.match(/\d/g) ?? []).join('');

const dialDigits = (format: PhoneFormat): string => digitsOf(format.dial);

/** Сколько цифр помещается в национальную часть: известная длина либо остаток от E.164. */
const nationalDigitCapacity = (format: PhoneFormat): number =>
  format.digits ?? E164_DIGITS - dialDigits(format).length;

const phoneDigitMessage = (count: number): string => {
  const tail = count % 100;
  const last = count % 10;

  if (tail >= 11 && tail <= 14) return UI_MESSAGES.validation.phoneDigitsMany;
  if (last >= 2 && last <= 4) return UI_MESSAGES.validation.phoneDigitsFew;

  return last === 1
    ? UI_MESSAGES.validation.phoneDigitsOne
    : UI_MESSAGES.validation.phoneDigitsMany;
};

/** Извлекает «чистые» цифры национального номера. */
export const extractDigits = (raw: string, format: PhoneFormat = DEFAULT_PHONE_FORMAT): string => {
  const countryCode = dialDigits(format);
  const maximumNationalDigits = nationalDigitCapacity(format);
  // СВОЙ префикс маски снимаем явно и ДО подсчёта цифр. Контролируемое поле возвращает сюда
  // собственный отформатированный вывод (`+7 (916) 123 - 45 - 67`), и без этой строки «7» из
  // «+7» считалась бы первой цифрой локального номера у любого НЕДОнабранного значения:
  // «+7 (9» → цифры «79» → «+7 (79» → на каждый ввод в начало доклеивается ещё семёрка.
  const withoutOwnPrefix = raw.replace(new RegExp(`^\\s*\\+${countryCode}`), '');
  const digits = digitsOf(withoutOwnPrefix);
  // Код страны БЕЗ «+» (79991234567 / 89991234567 — так приходит автозаполнение браузера)
  // отбрасываем только у ПЕРЕполненного номера. Национальный номер не трогаем, даже если он
  // начинается с тех же цифр, иначе теряется первая. Восьмёрка — междугородний префикс «+7»,
  // и знание это про одну страну: другим её приписывать нечего.
  const trunkPrefixLength =
    countryCode === '7' && digits.startsWith('8')
      ? 1
      : digits.startsWith(countryCode)
        ? countryCode.length
        : 0;
  const hasCountryPrefix = digits.length > maximumNationalDigits && trunkPrefixLength > 0;
  const nationalDigits = hasCountryPrefix ? digits.slice(trunkPrefixLength) : digits;

  return nationalDigits.slice(0, maximumNationalDigits);
};

/** Форматирует строку по группам формата: `+7 (916) 123 - 45 - 67`. */
export const formatPhone = (raw: string, format: PhoneFormat = DEFAULT_PHONE_FORMAT): string => {
  const digits = extractDigits(raw, format);

  if (digits.length === 0) return `${format.dial} `;

  const groups = format.groups ?? [];

  // Групп не знаем — показываем цифры сплошь. Расставить скобки «как обычно» значило бы
  // придумать формат чужой страны.
  if (groups.length === 0) return `${format.dial} ${digits}`;

  let formatted = format.dial;
  let digitOffset = 0;

  groups.forEach((groupLength, groupIndex) => {
    if (digits.length <= digitOffset) return;

    const groupDigits = digits.slice(digitOffset, digitOffset + groupLength);

    if (groupIndex === 0) {
      // Скобка закрывается, только когда за группой пошли следующие цифры: пока набирают
      // первую, номер стоит незакрытым — так каретка не перепрыгивает через символ.
      const firstGroupIsComplete = digits.length > digitOffset + groupLength;
      formatted += ` (${groupDigits}${firstGroupIsComplete ? ')' : ''}`;
    } else {
      const separator = groupIndex === 1 ? ' ' : ' - ';
      formatted += `${separator}${groupDigits}`;
    }

    digitOffset += groupLength;
  });

  return formatted;
};

/** Preserve the logical national-digit selection when separators move during native editing. */
export function normalizePhoneInput(
  rawValue: string,
  selectionStart: number | null,
  selectionEnd: number | null,
  format: PhoneFormat = DEFAULT_PHONE_FORMAT,
) {
  const formatted = formatPhone(rawValue, format);
  const displayValue = stripPrefix(formatted, format);

  const mapSelectionOffset = (rawOffset: number | null): number | null => {
    if (rawOffset === null) return null;
    if (rawOffset === rawValue.length) return displayValue.length;

    const digitsBeforeCursor = digitsOf(rawValue.slice(0, rawOffset)).length;
    if (digitsBeforeCursor === 0) return 0;

    let digitsSeen = 0;
    for (let index = 0; index < displayValue.length; index += 1) {
      const currentCharacter = displayValue[index];
      if (!currentCharacter || !/\d/.test(currentCharacter)) continue;

      digitsSeen += 1;
      if (digitsSeen !== digitsBeforeCursor) continue;

      let displayOffset = index + 1;
      const previousRawCharacter = rawValue[rawOffset - 1];
      const cursorFollowedASeparator =
        rawOffset > 0 && previousRawCharacter !== undefined && !/\d/.test(previousRawCharacter);

      if (cursorFollowedASeparator) {
        while (displayOffset < displayValue.length) {
          const nextCharacter = displayValue[displayOffset];
          if (!nextCharacter || /\d/.test(nextCharacter)) break;
          displayOffset += 1;
        }
      }

      return displayOffset;
    }

    return displayValue.length;
  };

  return {
    formatted,
    displayValue,
    selectionStart: mapSelectionOffset(selectionStart),
    selectionEnd: mapSelectionOffset(selectionEnd),
  };
}

/** Убирает префикс кода страны — его поле рисует отдельным узлом. */
export const stripPrefix = (
  formatted: string,
  format: PhoneFormat = DEFAULT_PHONE_FORMAT,
): string => formatted.replace(new RegExp(`^\\+${dialDigits(format)}\\s?`), '');

/** true если пользователь не ввёл ни одной цифры. */
export const isEmpty = (raw: string, format: PhoneFormat = DEFAULT_PHONE_FORMAT): boolean =>
  extractDigits(raw, format).length === 0;

/** Валидация: undefined = ок, строка = сообщение об ошибке. */
export const validate = (
  raw: string,
  format: PhoneFormat = DEFAULT_PHONE_FORMAT,
): string | undefined => {
  const d = extractDigits(raw, format);

  if (d.length === 0) return undefined;

  if (format.digits === undefined) {
    return d.length >= MIN_UNKNOWN_DIGITS ? undefined : UI_MESSAGES.validation.phoneIncomplete;
  }

  if (d.length === format.digits) return undefined;

  const total = dialDigits(format).length + format.digits;

  return formatUiMessage(phoneDigitMessage(total), { count: total });
};

/** Пустое значение поля — один префикс. */
export const emptyValue = (format: PhoneFormat = DEFAULT_PHONE_FORMAT): string => `${format.dial} `;

/**
 * Подсказка для нативного `placeholder`.
 *
 * У `type='tel'` её гасит слой-маска (он же рисует части разным цветом и весом), но фолбэк
 * обязан совпадать с ним по символам — иначе в одном поле живут два вида одной подсказки.
 */
export function placeholderText(format: PhoneFormat = DEFAULT_PHONE_FORMAT): string {
  const { sample } = format;
  if (!sample) return '';

  if (!sample.includes('_')) {
    return stripPrefix(formatPhone(sample, format), format);
  }

  const maximumLengthValue = formatPhone('9'.repeat(nationalDigitCapacity(format)), format);
  const visiblePattern = stripPrefix(maximumLengthValue, format);
  let sampleIndex = 0;

  return visiblePattern.replace(/\d/g, () => {
    const sampleCharacter = sample[sampleIndex];
    sampleIndex += 1;
    return sampleCharacter ?? '_';
  });
}

/** Потолок длины для `<input>`: полностью набранный номер плюс его разделители. */
export function maxLengthOf(format: PhoneFormat = DEFAULT_PHONE_FORMAT): number {
  const maximumLengthValue = formatPhone('9'.repeat(nationalDigitCapacity(format)), format);
  return maximumLengthValue.length;
}

/**
 * Подсказка ЧАСТЯМИ для слоя-маски: `dim` — группы цифр (серые, с разрядкой), остальное —
 * скобки и тире (чёрные, тире ДЛИННОЕ).
 *
 * Разложено ГРУППАМИ, а не плоским списком с пробелами внутри строк: в макете зазор между
 * группами ровно 4, а ширина пробела зависит от гарнитуры и кегля — то есть плоский список
 * давал бы «почти то» на каждом размере. Внутри группы «(999)» зазора нет вовсе.
 */
export const maskGroups = (format: PhoneFormat = DEFAULT_PHONE_FORMAT): PhoneMaskPart[][] => {
  const { sample, groups } = format;

  if (!sample || !groups?.length) return [];

  const parts: PhoneMaskPart[][] = [];
  let sampleOffset = 0;

  groups.forEach((groupLength, groupIndex) => {
    const groupSample = sample.slice(sampleOffset, sampleOffset + groupLength);
    sampleOffset += groupLength;

    if (!groupSample) return;

    if (groupIndex === 0) {
      parts.push([{ text: '(' }, { text: groupSample, dim: true }, { text: ')' }]);
      return;
    }

    if (groupIndex > 1) parts.push([{ text: '–' }]);

    parts.push([{ text: groupSample, dim: true }]);
  });

  return parts;
};
