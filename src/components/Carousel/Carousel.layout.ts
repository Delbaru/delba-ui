import type { ReactNode } from 'react';
import { getBreakpointIndex, resolveResponsive, resolveResponsiveAtBreakpoint } from '../../core';
import { buildLoopSlides, canEnableLoop, getPeekOffsetPx, hasScrollableSlides } from './slides';
import type { CarouselNavigation, CarouselProps, SlidesPerViewValue } from './types';

export interface CarouselMeasurement {
  breakpoint: 0 | 1 | 2;
  gap: number;
  width: number;
  slidesPerView: SlidesPerViewValue;
}

type LayoutOptions = Pick<
  CarouselProps,
  | 'orientation'
  | 'effect'
  | 'navigation'
  | 'pagination'
  | 'mousewheel'
  | 'drag'
  | 'initialSlide'
  | 'loop'
  | 'centeredSlides'
  | 'offsetBefore'
  | 'offsetAfter'
  | 'peekStart'
  | 'peekEnd'
  | 'speed'
  | 'scrollBased'
>;

interface SlideOptions {
  loop: boolean;
  initialSlide: number;
  navigation: CarouselNavigation;
  pagination: boolean;
}

function readSlidesPerView(value: string): SlidesPerViewValue {
  if (value === 'auto') return value;
  const number = Number(value.replace('-', '.'));
  return Number.isFinite(number) && number > 0 ? number : 1;
}

/** One measurement snapshot feeds every responsive and loop decision. */
export const carouselLayout = {
  initial(slidesPerView: CarouselProps['slidesPerView']): CarouselMeasurement {
    return {
      breakpoint: 0,
      gap: 0,
      width: 0,
      slidesPerView: resolveResponsive(slidesPerView)[0] ?? 1,
    };
  },

  measure(root: HTMLDivElement): CarouselMeasurement | undefined {
    const view = root.ownerDocument.defaultView;
    if (!view) return;
    const computed = view.getComputedStyle(root);
    const gap = parseFloat(computed.gap || '0');

    return {
      breakpoint: getBreakpointIndex(
        root.ownerDocument.documentElement.clientWidth || view.innerWidth,
      ),
      gap: Number.isFinite(gap) ? gap : 0,
      width: root.clientWidth,
      slidesPerView: readSlidesPerView(computed.getPropertyValue('--slides-per-view').trim()),
    };
  },

  same(previous: CarouselMeasurement, next: CarouselMeasurement): boolean {
    return (
      previous.breakpoint === next.breakpoint &&
      previous.gap === next.gap &&
      previous.width === next.width &&
      previous.slidesPerView === next.slidesPerView
    );
  },

  resolve(options: LayoutOptions, measurement: CarouselMeasurement) {
    const { breakpoint, width, slidesPerView, gap } = measurement;
    const offsetBefore = resolveResponsiveAtBreakpoint(options.offsetBefore, 0, breakpoint);
    const offsetAfter = resolveResponsiveAtBreakpoint(options.offsetAfter, 0, breakpoint);
    const peekStart = resolveResponsiveAtBreakpoint(options.peekStart, 0, breakpoint);
    const peekEnd = resolveResponsiveAtBreakpoint(options.peekEnd, 0, breakpoint);

    return {
      orientation: resolveResponsiveAtBreakpoint(options.orientation, 'horizontal', breakpoint),
      effect: resolveResponsiveAtBreakpoint(options.effect, 'slide', breakpoint),
      mousewheel: resolveResponsiveAtBreakpoint(options.mousewheel, false, breakpoint),
      drag: !options.scrollBased && resolveResponsiveAtBreakpoint(options.drag, true, breakpoint),
      initialSlide: resolveResponsiveAtBreakpoint(options.initialSlide, 0, breakpoint),
      speed: resolveResponsiveAtBreakpoint(options.speed, undefined, breakpoint),
      loop: resolveResponsiveAtBreakpoint(options.loop, false, breakpoint),
      centered: resolveResponsiveAtBreakpoint(options.centeredSlides, false, breakpoint),
      navigation: resolveResponsiveAtBreakpoint(options.navigation, 'none', breakpoint),
      pagination: resolveResponsiveAtBreakpoint(options.pagination, false, breakpoint),
      offsetBefore: offsetBefore + getPeekOffsetPx(width, slidesPerView, gap, peekStart),
      offsetAfter: offsetAfter + getPeekOffsetPx(width, slidesPerView, gap, peekEnd),
    };
  },

  slides(slides: ReactNode[], layout: SlideOptions, slidesPerView: SlidesPerViewValue) {
    const plan = layout.loop
      ? buildLoopSlides(slides, slidesPerView)
      : {
          renderedSlides: slides,
          initialSlideOffset: 0,
          middleCycleIndex: 0,
          usesPaddedLoop: false,
        };
    const initialSlide =
      plan.renderedSlides.length > 0
        ? Math.min(
            Math.max(layout.initialSlide, 0) + plan.initialSlideOffset,
            plan.renderedSlides.length - 1,
          )
        : 0;
    const scrollable = hasScrollableSlides(slides.length, slidesPerView);

    return {
      ...plan,
      initialSlide,
      loop:
        layout.loop &&
        !plan.usesPaddedLoop &&
        canEnableLoop(plan.renderedSlides.length, slidesPerView),
      showNavigation:
        scrollable && (layout.navigation === 'arrows' || layout.navigation === 'both'),
      showDots:
        scrollable &&
        (layout.pagination || layout.navigation === 'dots' || layout.navigation === 'both'),
    };
  },
};

export type CarouselResolvedLayout = ReturnType<typeof carouselLayout.resolve>;
export type CarouselSlidePlan = ReturnType<typeof carouselLayout.slides>;
