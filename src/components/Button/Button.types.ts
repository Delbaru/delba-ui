import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, StateLinkInput } from '#core';
import type { LinkPrefetchProps } from '../../hooks/useLinkPrefetch';
import type { SurfaceAnimate, SurfaceMotionOptions } from '#core/Motion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { PopupOptions } from '../../core/Popup/Popup';
import type { ActionOptions } from '#core/Form';
import type { ActionInvocationResult } from '../../hooks/useActionInvocation';
import type { TextProps } from '../Text';

export type ButtonVariant = 'primary' | 'secondary' | 'secondaryFill' | 'tertiary';
export type ButtonSize = 'small' | 'medium' | 'large';

type AlignItemsKey = 'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline';
type JustifyContentKey = 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';

/** Независимые эффекты появления, наведения и покоя. */
export type ButtonAnimate = Omit<SurfaceAnimate, 'change'>;

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'href' | 'target' | 'rel'>,
    Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
    Omit<BoxLayoutProps, 'aspectRatio'>,
    Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'>, LinkPrefetchProps {
  /** Появление, hover/idle или их совместная настройка. */
  animate?: ButtonAnimate;
  children?: React.ReactNode;
  /** Жизненный цикл действия или внешний контроллер, подсказка либо меню. */
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
  textAlign?: TextProps['textAlign'];

  gap?: ResponsiveValue<number>;
  color?: string;
  state?: ComponentStateValue;

  linkState?: StateLinkInput;

  /** Called exactly once when a click handler settles (not for disabled/reentrant clicks). */
  onActionSettled?: (result: ActionInvocationResult) => void;
  /** Optional diagnostic name surfaced to the app's single failure handler. */
  actionName?: string;
}
