import type { FontName } from '../../theme';
import type React from 'react';
import type { CSSProperties } from 'react';
import type {
  BoxLayoutProps,
  ComponentStateValue,
  ResponsiveValue,
  StateLinkInput,
} from '#core';
import type { InteractiveRootProps } from '#core/Element';
import type { SurfaceMotionOptions } from '#core/Motion';
import type { PopupOptions } from '../../core/Popup/Popup';
import type { TextRole, TextVariantName } from '../../core/base/typography';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { TextAnimate } from './animations/types';
import type { LineHeightValue } from './typography';
import type { TextFormat } from './formatContent';

/**
 * Вариант проекта (`UiTypography`), служебная роль кита или 'inherit' — не навязывать типографику:
 * для Text внутри Text (цветные куски чужого заголовка).
 */
type VariantKey = TextVariantName | TextRole | 'inherit';
type FontFamilyKey = FontName | 'inherit';
type TextAlignValue = 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
type WhiteSpaceValue = 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces';

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    Pick<InteractiveRootProps, 'href' | 'target' | 'rel' | 'download' | 'prefetch'>,
    Omit<BoxLayoutProps, 'aspectRatio'>,
    Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
  children?: React.ReactNode;
  style?: CSSProperties;
  format?: ResponsiveValue<TextFormat>;
  /** Text-only hosts receive the final text as a string. Hosts that admit spans can animate the content. */
  animate?: TextAnimate;
  /** Popup attached to the text host. */
  ui?: { popup?: PopupOptions };
  required?: boolean;

  newTab?: boolean;
  nofollow?: boolean;
  noreferrer?: boolean;

  as?: keyof React.JSX.IntrinsicElements;
  /** Machine-readable date when rendered as time. */
  dateTime?: React.TimeHTMLAttributes<HTMLTimeElement>['dateTime'];
  /** Associates Text rendered as a label with its native form control. */
  htmlFor?: React.LabelHTMLAttributes<HTMLLabelElement>['htmlFor'];
  variant?: ResponsiveValue<VariantKey>;
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
