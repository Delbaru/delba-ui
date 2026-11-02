import type React from 'react';
import type { CSSProperties } from 'react';
import type {
  BoxLayoutProps,
  ComponentStateValue,
  FieldValueChangeHandler,
  ResponsiveValue,
  StateLinkInput,
} from '../../core';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
type VariantKey = 'primary' | 'secondary';
type SizeKey = 'default' | 'fullWidth';

export interface TextareaProps
  extends Omit<
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
      | 'color'
      | 'placeholder'
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
  /** Оформление нативного textarea; style корня относится ко всему полю. */
  field?: { className?: string; style?: CSSProperties };
  /** Настоящее событие ввода нативного textarea. */
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  /** Значение модели после ввода или восстановления seed. */
  onValueChange?: FieldValueChangeHandler<HTMLTextAreaElement>;

  variant?: ResponsiveValue<VariantKey>;
  size?: ResponsiveValue<SizeKey>;

  color?: string;

  placeholder?: string;
  placeholderColor?: string;

  seed?: string;

  loading?: boolean;
  label?: string;
  labelColor?: string;
  comment?: string;

  rows?: number;
  length?: { min?: number; max?: number };
  showCount?: boolean;

  countPlacement?: 'inside' | 'below';

  error?: string;

  /** Сворачивать поле целиком, включая подпись, ошибку и комментарий. */
  collapse?: CollapseOptions;

  state?: ComponentStateValue;

  required?: boolean;
  emptyMessage?: string;
  validate?: (value: string) => string | undefined;

  linkState?: StateLinkInput;
  'data-point-events'?: string;

  /** Класс на САМО поле (внутренний .Textarea — тот, что несёт фон/рамку), а не на обёртку
   *  с label/comment, куда садится className. Нужен скин-обёрткам (SharedTextarea), которые
   *  красят поле осями из components/system/_axes.scss: без этого класс-ось приземлился бы
   *  на обёртку и покрасил бы заодно подпись. */
  fieldClassName?: string;
}
