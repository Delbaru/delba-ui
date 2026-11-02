import type React from 'react';
import type { CSSProperties, SVGProps } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, SizeValue, StateLinkInput } from '../../core';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { IconTooltipDirection } from './IconTooltip/IconTooltip';
import type { IconComponent, IconSource } from './svg';
import type { IconAnimate } from './swap';

// `r` у SVG — радиус окружности; у Icon это радиус коробки (кортежем), поэтому родной убран.
type IconBaseSvgProps = Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'color' | 'rotate' | 'strokeWidth' | 'r' | 'onFocus' | 'onBlur'>;
export type IconElementProps = IconBaseSvgProps & Record<string, unknown>;

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

export interface IconProps extends Omit<IconBaseSvgProps, keyof BoxLayoutProps>, BoxLayoutProps, IconRootSizeProps, IconRootStyleProps, SharedMotionProps<IconAnimate> {
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
  // import arrow from '@delba/ui/icons/arrows/arrow_bold.svg' → src={assetUrl(arrow)}
  // Пример: name="ui/arrows/arrow_bold" -> загружает /icons/ui/arrows/arrow_bold.svg
  name?: string;

  // hover-иконка. Поддерживает старую строку с именем файла, path string и object source.
  // Примеры:
  // hover="ui/favourite/favourite_white.svg"
  // hover="/icons/ui/favourite/favourite_white.svg"
  // hover={FavouriteHoverIcon}
  // hover={{ src: '/icons/ui/favourite/favourite_white.svg' }}
  // hover={{ name: 'ui/favourite/favourite_white' }}
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
  tooltip?: React.ReactNode;
  tooltipDirection?: IconTooltipDirection;
  tooltipGap?: number;

  linkState?: StateLinkInput;

  /** Смена глифа: animate={{ when: 'change', effect: 'swap', duration: 'fast' }}. */
  animate?: SharedMotionProps<IconAnimate>['animate'];
}
