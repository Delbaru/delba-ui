import type React from 'react';
import type { CSSProperties, SVGProps } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, SizeValue, StateLinkInput } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';
import type { TooltipPopup } from '../../core/Popup/Popup';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { IconComponent, IconSource } from './svg';
import type { IconChangeAnimate } from './swap';

// `r` у SVG — радиус окружности; у Icon это радиус коробки (кортежем), поэтому родной убран.
type IconBaseSvgProps = Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'color' | 'rotate' | 'strokeWidth' | 'r' | 'onFocus' | 'onBlur'>;
export type IconAnimate = MotionChannels<{ change: IconChangeAnimate }>;

type IconRootSizeProps = {
  rootW?: ResponsiveValue<SizeValue>;
  rootMinW?: ResponsiveValue<SizeValue>;
  rootMaxW?: ResponsiveValue<SizeValue>;
  rootH?: ResponsiveValue<SizeValue>;
  rootMinH?: ResponsiveValue<SizeValue>;
  rootMaxH?: ResponsiveValue<SizeValue>;
};

type IconRootStyleProps = {
  rootR?: ResponsiveValue<number>;
  rootTLR?: ResponsiveValue<number>;
  rootTRR?: ResponsiveValue<number>;
  rootBRR?: ResponsiveValue<number>;
  rootBLR?: ResponsiveValue<number>;
  rootBg?: ResponsiveValue<string>;
  rootClassName?: string;
};

export interface IconProps
  extends Omit<IconBaseSvgProps, keyof BoxLayoutProps>,
    BoxLayoutProps,
    IconRootSizeProps,
    IconRootStyleProps,
    Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
  /** Focus callbacks receive the actual focusable Icon element, which may be its anchor. */
  onFocus?: React.FocusEventHandler<Element>;
  onBlur?: React.FocusEventHandler<Element>;
  /** Сворачивает слот иконки; по умолчанию — по ширине для кнопок и строк. */
  collapse?: CollapseOptions;
  'data-point-events'?: string;
  // URL иконки или импортированный SVG-компонент
  // Пример: src="https://example.com/icon.svg"
  // Пример: src={ArrowIcon}
  src?: string | IconComponent;

  // Имя иконки проекта (загружается из его public/icons/{name}.svg). Иконки кита — импортом:
  // import arrow from '@delba/frontend/icons/controls/arrow-up.svg' → src={assetUrl(arrow)}
  // Пример: name="actions/arrow-up" -> загружает /icons/actions/arrow-up.svg
  name?: string;

  // hover-иконка. Поддерживает старую строку с именем файла, path string и object source.
  // Примеры:
  // hover="actions/favourite-filled.svg"
  // hover="/icons/actions/favourite-filled.svg"
  // hover={FavouriteHoverIcon}
  // hover={{ src: '/icons/actions/favourite-filled.svg' }}
  // hover={{ name: 'actions/favourite-filled' }}
  hover?: string | IconComponent | IconSource;

  // Или готовый SVG компонент (результат импорта через SVGR из src/assets/icons)
  // Пример: import ArrowIcon from '@/assets/icons/arrow-right.svg';
  component?: IconComponent;

  /** Если задан — иконка оборачивается в <a> */
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;

  style?: CSSProperties;

  // rotation (in degrees). Example: rotate={-135} or rotate={[-135, null, null]}
  rotate?: ResponsiveValue<number | string>;

  // layout props (tokens)

  // simple style overrides (single value)
  color?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: ResponsiveValue<number | string>;
  state?: ComponentStateValue;
  /** Tooltip anchored to the link, frame, hover stack or inline SVG in that order. */
  ui?: { popup?: TooltipPopup };

  linkState?: StateLinkInput;

  /** Смена глифа: animate={{ change: { effect: 'swap', duration: 'fast' } }}. */
  animate?: IconAnimate;
}
