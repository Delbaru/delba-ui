import type React from 'react';
import type { CSSProperties } from 'react';
import type {
  BoxLayoutProps,
  ComponentStateValue,
  ResponsiveInput,
  ResponsiveValue,
  StateLinkInput,
} from '../../core';
import type { TextRole, TextVariantName } from '../../core/base/typography';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { AnimationInput, TextAnimate } from './animations/types';
import type { LineHeightValue } from './typography';
import type { TextFormat } from './formatContent';

/**
 * Вариант проекта (`UiTypography`), служебная роль кита или 'inherit' — не навязывать типографику:
 * для Text внутри Text (цветные куски чужого заголовка).
 */
type VariantKey = TextVariantName | TextRole | 'inherit';
type FontFamilyKey = 'primary' | 'secondary' | 'inherit';
type TextAlignValue = 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
type WhiteSpaceValue = 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces';

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
    Omit<BoxLayoutProps, 'aspectRatio'>,
    SharedMotionProps<ResponsiveInput<AnimationInput> | TextAnimate> {
  children?: React.ReactNode;
  style?: CSSProperties;
  format?: ResponsiveValue<TextFormat>;
  /** Появление, эффект текста или композиция: `{ when: 'inView', effect: { up: {}, counter: { to: 100 } } }`. */
  animate?: SharedMotionProps<ResponsiveInput<AnimationInput> | TextAnimate>['animate'];
  required?: boolean;

  newTab?: boolean;
  nofollow?: boolean;
  noreferrer?: boolean;

  as?: keyof React.JSX.IntrinsicElements;
  /** Associates Text rendered as a label with its native form control. */
  htmlFor?: React.LabelHTMLAttributes<HTMLLabelElement>['htmlFor'];
  variant?: ResponsiveValue<VariantKey>;
  /** @deprecated Use object animate with an explicit when/effect. */
  animation?: ResponsiveInput<AnimationInput>;
  /** Сворачивание текста с сохранением содержимого до конца анимации закрытия. Для блочного текста. */
  collapse?: CollapseOptions;

  /** Размер в rpx либо CSS-длина (`min(…, 10svh)`, `var(…)`); поверх variant. */
  fontSize?: ResponsiveValue<number | string>;
  fontWeight?: ResponsiveValue<number>;
  lineHeight?: ResponsiveValue<LineHeightValue>;
  fontFamily?: ResponsiveValue<FontFamilyKey>;

  color?: string;
  textTransform?: ResponsiveValue<string>;
  /** Межбуквенный интервал: число в rpx либо CSS-длина, например '-0.03em'. */
  letterSpacing?: ResponsiveValue<number | string>;
  textAlign?: ResponsiveValue<TextAlignValue>;
  whiteSpace?: ResponsiveValue<WhiteSpaceValue>;
  rows?: ResponsiveValue<number>;
  ellipsis?: boolean;

  state?: ComponentStateValue;

  linkState?: StateLinkInput;
}
