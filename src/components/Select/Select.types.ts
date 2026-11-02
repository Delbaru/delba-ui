import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, StateLinkInput, ResponsiveValue } from '../../core';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { DropdownPanelOptions } from '../Dropdown';
import type { SelectItem } from './options';
import type { SelectRenderValuePayload } from './useSelect';
type VariantKey = 'primary' | 'primaryFill' | 'secondary';
type SizeKey = 'default' | 'fullWidth';
/** Пропсы Select без значения. Обёртке: `SelectBaseProps<T> & SelectValueProps<T>`, а не `extends SelectProps`. */
export interface SelectBaseProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'dir' | 'rel'>,
    BoxLayoutProps,
    SharedMotionProps {
  className?: string;

  /** Сворачивает всё поле вместе с подписью и ошибкой; не управляет списком вариантов. */
  collapse?: CollapseOptions;

  /** Класс на САМ триггер (внутренний .Select — тот, что несёт фон/рамку), а не на обёртку
   *  с label/comment, куда садится className. Нужен скин-обёрткам (SharedSelect), которые
   *  красят поле осями из components/system/_axes.scss: без этого класс-ось приземлился бы
   *  на обёртку и покрасил бы заодно подпись. */
  fieldClassName?: string;

  style?: CSSProperties;

  options: readonly SelectItem<T>[];
  /** Имя поля в FormData. При multiple каждое выбранное значение отправляется отдельной записью. */
  name?: string;
  /** ID формы, когда Select расположен вне её DOM-поддерева. */
  form?: string;


  closeOnSelect?: boolean;

  /** Показывать уже выбранные значения в dropdown. */
  showSelected?: boolean;

  /**
   * Полностью кастомный рендер выбранного значения.
   * Удобно для multiple или сложной верстки в trigger.
   */
  renderValue?: (payload: SelectRenderValuePayload<T>) => React.ReactNode;

  placeholder?: string;
  placeholderColor?: string;

  loading?: boolean;
  label?: string;
  labelColor?: string;
  comment?: string;

  variant?: ResponsiveValue<VariantKey>;
  size?: ResponsiveValue<SizeKey>;

  color?: string;

  error?: string;

  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  visibleOptions?: number;

  /** Оформление и движение списка через общий API панели Dropdown; состоянием управляет Select. */
  panel?: Pick<DropdownPanelOptions, 'animate' | 'collapse' | 'offset' | 'r'>;

  state?: ComponentStateValue;

  linkState?: StateLinkInput;

  id?: string;
  'aria-label'?: string;
  'data-point-events'?: string;
}

/**
 * Значение по ветке `multiple`: одиночный выбор — `T | null`, множественный — `T[]`.
 * `defaultValue` не участвует в выводе `T`: литерал `['ru']` иначе сузил бы тип опций до `'ru'`.
 */
export type SelectValueProps<T extends string = string> =
  | {
      multiple?: false;
      value?: T | null;
      defaultValue?: NoInfer<T> | null;
      onChange?: (value: T | null) => void;
      validate?: (value: T | null) => string | undefined;
    }
  | {
      multiple: true;
      value?: T[];
      defaultValue?: NoInfer<T>[];
      onChange?: (value: T[]) => void;
      validate?: (value: T[]) => string | undefined;
    };

export type SelectProps<T extends string = string> = SelectBaseProps<T> & SelectValueProps<T>;
