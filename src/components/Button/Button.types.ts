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
import type { PopupOptions } from '../../core/Popup/Popup';
import type { ActionOptions } from '../../core/Form';
import type { ActionInvocationResult } from '../../hooks/useActionInvocation';

/** Only an explicit object enables the new tooltip API. */
export interface ButtonTooltipOptions {
  label: React.ReactNode;
  direction?: 'right' | 'left' | 'top' | 'bottom';
  gap?: number;
}

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
  /** Use the existing action lifecycle, or an externally owned controller (e.g. a form). */
  ui?: { action?: ActionOptions; popup?: PopupOptions };
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

  /** Tooltip only when explicitly requested. ReactNode is a temporary kit compatibility form. */
  tooltip?: ButtonTooltipOptions | React.ReactNode;
  /** @deprecated Direction belongs to the tooltip object. */
  tooltipDirection?: 'right' | 'left' | 'top' | 'bottom';
  /** @deprecated Gap belongs to the tooltip object. */
  tooltipGap?: number;
  /** Called exactly once when a click handler settles (not for disabled/reentrant clicks). */
  onActionSettled?: (result: ActionInvocationResult) => void;
  /** Optional diagnostic name surfaced to the app's single failure handler. */
  actionName?: string;
}
