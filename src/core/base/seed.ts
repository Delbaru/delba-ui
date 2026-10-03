/**
 * `seed` — значение по умолчанию поля, которое ведёт себя как ПОДСКАЗКА.
 *
 * Проблема, которую закрывает эта дверь: засеянное значение (`value ?? '0'` у «Штрафа»,
 * `useState('1')` у баллов) выглядит как данные и не исчезает. В поле с «0» ввод «1» даёт «01»,
 * и человек не понимает, что перед ним его собственный ответ или подсказка конструктора.
 * Обычный `placeholder` не годится: он не часть значения, поэтому модель получает «нет
 * значения», и расчёт баллов и штрафов едет на пустом.
 *
 * Правило одно: пока в поле стоит `seed`, оно рисуется цветом подсказки
 * (`--field-placeholder-color`), по фокусу поле пустеет, а уход из пустого поля возвращает
 * `seed` назад. Модель при этом НЕ меняется и после blur получает валидное значение — сама
 * валидация и все расчёты видят обычное число.
 *
 * Отдельный `placeholder` (вид Б — настоящие подсказки вроде «Введите свой ответ числом»)
 * держит ту же дверь на цвет: обе подсказки — один токен.
 */

export interface SeedFieldInput {
  /** Значение по умолчанию из пропа `seed`. Пустой — подсказки нет, поле обычное. */
  seed?: string;
  /** Значение модели поля (то, что поле получает в `value`). */
  value: string;
  /** Обычный `placeholder` поля. */
  placeholder?: string;
}

export interface SeedField {
  /** Что отдать нативному полю в `value`. */
  displayValue: string;
  /** Рисуется ли подсказка вместо значения. */
  isHintShown: boolean;
  /** Что отдать нативному полю в `placeholder`. */
  placeholder: string | undefined;
  /** Что отдать в `onChange` по фокусу. `undefined` — отдавать нечего. */
  focusValue: string | undefined;
  /** Что отдать в `onChange` по уходу. `undefined` — отдавать нечего. */
  blurValue: string | undefined;
}

/**
 * Все решения двери в одном месте: что показать и что отдать в `onChange`.
 *
 * Показанное значение, когда в поле стоит `seed`, — ПУСТОЕ: рисует его `::placeholder`, а он
 * браузер сам убирает по фокусу. Поэтому «поле пустеет» получается без ветки в обработчике
 * фокуса, и неуправляемое поле ведёт себя так же, как управляемое.
 *
 * По уходу значение по умолчанию возвращается только если человек его стёр: пустое поле после
 * blur обязано получить в модель валидное значение, иначе «Штраф 0» стал бы «штрафа нет».
 */
export function resolveSeedField({ seed, value, placeholder }: SeedFieldInput): SeedField {
  const hasSeed = Boolean(seed);
  const isHintShown = hasSeed && value === seed;

  return {
    isHintShown,
    displayValue: isHintShown ? '' : value,
    placeholder: isHintShown ? seed : placeholder,
    focusValue: isHintShown ? '' : undefined,
    blurValue: !isHintShown && hasSeed && value.trim() === '' ? seed : undefined,
  };
}