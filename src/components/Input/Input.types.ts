import type React from 'react';
import type { CSSProperties } from 'react';

import type {
  BoxLayoutProps,
  ComponentStateValue,
  FieldValueChangeHandler,
  ResponsiveValue,
  StateLinkInput,
} from '../../core';
import type { TextRole, TextVariantName } from '../../core/base/typography';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { PhoneFormat } from '../../core/fields/phone';

type VariantKey = 'primary' | 'secondary';
type SizeKey = 'default' | 'fullWidth';
type FontKey = TextVariantName | TextRole;

export interface InputProps
  extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      | 'color'
      | 'placeholder'
      | 'size'
      | 'width'
      | 'minWidth'
      | 'maxWidth'
      | 'height'
      | 'minHeight'
      | 'maxHeight'
    >,
    BoxLayoutProps,
    SharedMotionProps {
  style?: CSSProperties;
  /** Настоящее событие ввода; target.value содержит текст нативного поля, до форматирования. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Значение модели после маски, seed, шага числа или выбора даты. */
  onValueChange?: FieldValueChangeHandler<HTMLInputElement>;

  variant?: ResponsiveValue<VariantKey>;
  size?: ResponsiveValue<SizeKey>;
  /** Типографика поля (--font-*). Не задан → роль `body`. */
  font?: FontKey;

  color?: string;

  placeholder?: string;
  placeholderColor?: string;
  /** Значение-подсказка: очищается по фокусу и возвращается при уходе из пустого поля. */
  seed?: string;
  label?: string;
  labelColor?: string;
  comment?: string;
  showNumberControls?: boolean;
  numberOptions?: number[];
  /** Кнопка показа пароля. По умолчанию выключена. */
  revealable?: boolean;
  /** Скелетон вместо значения; оболочка и подпись остаются на месте. */
  loading?: boolean;

  length?: { min?: number; max?: number };
  /** Формат type='tel': код страны, длина и группы цифр. По умолчанию +7. */
  phone?: PhoneFormat;
  /** Содержимое по краям строки поля; ref и события остаются у самого input. */
  slots?: { start?: React.ReactNode; end?: React.ReactNode };
  type?: React.HTMLInputTypeAttribute;

  error?: string;

  /** Сворачивать поле целиком, включая подпись, ошибку и комментарий. */
  collapse?: CollapseOptions;

  state?: ComponentStateValue;

  /** Класс строки с фоном и рамкой; className относится ко всей оболочке. */
  rowClassName?: string;
  /** Оформление нативного input; className/style корня по-прежнему относятся ко всему полю. */
  field?: { className?: string; style?: CSSProperties };
  /** Сохранить нативный required для форм с браузерной валидацией. По умолчанию обязательность проверяет кит. */
  nativeValidation?: boolean;

  required?: boolean;
  emptyMessage?: string;
  validate?: (value: string) => string | undefined;
  /** Ошибка внутри значения или под полем. По умолчанию inside; для телефона — below. */
  errorPlacement?: 'inside' | 'below';

  linkState?: StateLinkInput;
  'data-point-events'?: string;
}
