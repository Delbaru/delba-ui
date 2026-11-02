import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, StateLinkInput } from '../../core';
import type { LinkPrefetchProps } from '../../hooks/useLinkPrefetch';
import type { AppearanceAnimate } from '../../core/reveal/reveal';
import type { HoverTransformAnimate } from '../../core/base/hover-motion';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { ButtonHoverAnimate } from './hover/buttonHover';
import type { ButtonIdleAnimate } from './idle/buttonIdle';

export type ButtonVariant = 'primary' | 'secondary' | 'secondaryFill' | 'tertiary';
export type ButtonSize = 'small' | 'medium' | 'large';

type AlignItemsKey = 'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline';
type JustifyContentKey = 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';

/** Появление сочетается с независимыми эффектами наведения и покоя. Legacy when остаётся поддержан. */
export type ButtonAnimate = HoverTransformAnimate | ButtonHoverAnimate | ButtonIdleAnimate | (AppearanceAnimate & {
  /** Наведение поверх появления; false явно отключает эффект роли. */
  hover?: Omit<ButtonHoverAnimate, 'when'> | false;
  /** Эффект в покое поверх появления. */
  idle?: Omit<ButtonIdleAnimate, 'when'>;
});

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'href' | 'target' | 'rel'>,
    Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
    Omit<BoxLayoutProps, 'aspectRatio'>,
    Omit<SharedMotionProps, 'animate'>, LinkPrefetchProps {
  /** Появление, hover/idle или их совместная настройка. */
  animate?: ButtonAnimate;
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Сворачивает кнопку целиком; для ширины укажите `axis: 'column'`. */
  collapse?: CollapseOptions;

  newTab?: boolean;
  nofollow?: boolean;
  noreferrer?: boolean;

  variant?: ResponsiveValue<ButtonVariant>;
  size?: ResponsiveValue<ButtonSize>;

  justifyContent?: ResponsiveValue<JustifyContentKey>;
  alignItems?: ResponsiveValue<AlignItemsKey>;

  gap?: ResponsiveValue<number>;
  color?: string;
  state?: ComponentStateValue;

  linkState?: StateLinkInput;

  /** Подсказка при наведении или фокусе; изменение текста сохраняет DOM-узел кнопки. */
  tooltip?: React.ReactNode;
  /** Tooltip position relative to the button: right, left, top, bottom. Default: right */
  tooltipDirection?: 'right' | 'left' | 'top' | 'bottom';
  /** Gap between button and tooltip in px. Default: 8 */
  tooltipGap?: number;
}
