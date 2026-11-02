import type { AspectRatioValue, GrowProps, ResponsiveValue, SizeValue, StateLinkInput } from '../../core';
import type { CSSProperties, ReactNode } from 'react';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { MotionTime } from '../../core/base/timing';

export type OrientationKey = 'horizontal' | 'vertical';
export type CarouselOrientation = OrientationKey;
export type EffectKey = 'slide' | 'fade' | 'cube' | 'coverflow' | 'flip';
export type CarouselScrollEffect = EffectKey;
export type NavigationKey = 'dots' | 'arrows' | 'both' | 'none';
export type CarouselNavigation = NavigationKey;
export type SlidesPerViewValue = number | 'auto';
export type CarouselAutoplay = boolean | { delay?: MotionTime; disableOnInteraction?: boolean };
export type AlignItemsKey = 'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline';
export type JustifyContentKey = 'flex_start' | 'flex_end' | 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';
export type CarouselPeekValue = number;

export interface CarouselNavigationState {
  isBeginning: boolean;
  isEnd: boolean;
  prevDisabled: boolean;
  nextDisabled: boolean;
}

export interface CarouselApi {
  prev: () => void;
  next: () => void;
  goTo: (index: number) => void;
  getNavigationState: () => CarouselNavigationState;
}

export type CarouselApiRef = { current: CarouselApi | null } | ((api: CarouselApi | null) => void);

export interface CarouselProps extends GrowProps, SharedMotionProps {
  /** Source slide content; each child becomes one SwiperSlide. */
  children: ReactNode | ReactNode[];

  /** Stable identifier for external CarouselNav and CarouselDots. */
  carouselId?: string;

  /** Gap on desktop, mobile and tablet. */
  gap?: ResponsiveValue<number>;

  /** Visible slides on each responsive band; defaults to one. */
  slidesPerView?: ResponsiveValue<SlidesPerViewValue>;

  /** Responsive width. */
  w?: ResponsiveValue<SizeValue>;
  /** Responsive minimum width. */
  minW?: ResponsiveValue<SizeValue>;
  /** Responsive maximum width. */
  maxW?: ResponsiveValue<SizeValue>;
  /** Responsive height. */
  h?: ResponsiveValue<SizeValue>;
  /** Responsive minimum height. */
  minH?: ResponsiveValue<SizeValue>;
  /** Responsive maximum height. */
  maxH?: ResponsiveValue<SizeValue>;
  /** Responsive root aspect ratio. */
  aspectRatio?: ResponsiveValue<AspectRatioValue>;

  /** Slide direction; defaults to horizontal. */
  orientation?: ResponsiveValue<OrientationKey>;

  /** Смена слайда: сдвиг (`slide`), растворение (`fade`) или объёмные `cube`, `coverflow`, `flip`. Тени объёмных эффектов выключены. */
  effect?: ResponsiveValue<EffectKey>;

  /** Enable arrows, dots, both or neither on each band. */
  navigation?: ResponsiveValue<NavigationKey>;

  /** Enable page dots on each band. */
  pagination?: ResponsiveValue<boolean>;

  /** Autoplay delay is seconds or a timing name. */
  autoplay?: CarouselAutoplay;

  /** Allow wheel navigation; defaults to false. */
  mousewheel?: ResponsiveValue<boolean>;

  /** Allow touch/pointer dragging; defaults to true. */
  drag?: ResponsiveValue<boolean>;

  /** Initial logical slide index; defaults to zero. */
  initialSlide?: ResponsiveValue<number>;

  /** Enable wrapping; defaults to false. */
  loop?: ResponsiveValue<boolean>;
  /** Center the active slide; defaults to false. */
  centeredSlides?: ResponsiveValue<boolean>;
  /** Leading track offset in design units. */
  offsetBefore?: ResponsiveValue<number>;
  /** Trailing track offset in design units. */
  offsetAfter?: ResponsiveValue<number>;
  /** Fraction of the previous slide revealed at the leading edge. */
  peekStart?: ResponsiveValue<CarouselPeekValue>;
  /** Fraction of the next slide revealed at the trailing edge. */
  peekEnd?: ResponsiveValue<CarouselPeekValue>;

  /** Slide transition duration in seconds or a timing name. */
  speed?: ResponsiveValue<MotionTime>;
  /** Инерция после броска: доля скорости, с которой лента докатывается, затем доводится к слайду. Не задано или 0 — листание по слайдам. */
  inertia?: number;

  /** Responsive root padding. */
  padding?: ResponsiveValue<number>;
  /** Slide content horizontal alignment. */
  justify?: ResponsiveValue<JustifyContentKey>;
  /** Slide content vertical alignment. */
  align?: ResponsiveValue<AlignItemsKey>;

  /** Additional class applied to each slide. */
  slideClassName?: string;
  /** Additional class on the Swiper root. */
  wrapperClassName?: string;
  /** Класс корня `CarouselDots`, привязанных к этой карусели. */
  /** Additional class forwarded to linked dots. */
  paginationClassName?: string;
  /** Класс корня `CarouselNav`, привязанной к этой карусели. */
  /** Additional class forwarded to linked navigation. */
  navigationClassName?: string;
  /** Additional carousel root class. */
  className?: string;

  /** Ленту ведёт внешняя прокрутка, а не палец: перетаскивание выключено. */
  /** Let external scrollProgress own position and disable drag. */
  scrollBased?: boolean;
  /** Положение ленты 0…1 при `scrollBased`. */
  /** External track progress from zero to one. */
  scrollProgress?: number;

  /** Inline root styles. */
  style?: CSSProperties;

  /** Shared interaction state of the carousel. */
  linkState?: StateLinkInput;
  /** Receives the mounted command API and null during cleanup. */
  apiRef?: CarouselApiRef;
  /** Boundary notification after each navigation change. */
  onNavigationStateChange?: (state: CarouselNavigationState) => void;
  /** Called for every changed logical slide index, independently of boundary/button state. */
  /** Logical slide index notification. */
  onActiveIndexChange?: (index: number) => void;

  /** Consumer mouse-enter callback, composed with shared motion. */
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  /** Consumer mouse-leave callback, composed with shared motion. */
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}
