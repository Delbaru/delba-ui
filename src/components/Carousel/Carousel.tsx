'use client';

import { Swiper as SwiperRoot, SwiperSlide } from 'swiper/react';

import styles from './Carousel.module.scss';
import { composeInteractionHandlers, createLayoutClasses, cx, stateLinkProps, type ResponsiveValue, type WithRef } from '../../core';
import type { CarouselProps } from './types';
import { useCarousel } from './useCarousel';

const c = createLayoutClasses(styles);

/**
 * Swiper adapter that preserves the current shared Carousel API and markup hooks.
 *
 * Live call sites currently use `gap`, `slidesPerView`, `loop`, `apiRef` and
 * `onNavigationStateChange`, so the adapter keeps that contract and removes the
 * custom drag/inertia implementation.
 */
export function Carousel({
  ref,
  children,
  carouselId: explicitCarouselId,
  gap,
  slidesPerView = [1, 1, 1],
  aspectRatio,
  w,
  minW,
  maxW,
  h,
  minH,
  maxH,
  grow,
  orientation = ['horizontal', 'horizontal', 'horizontal'],
  effect = ['slide', 'slide', 'slide'],
  navigation,
  pagination,
  autoplay,
  mousewheel = [false, false, false],
  drag = [true, true, true],
  initialSlide = [0, 0, 0],
  loop = [false, false, false],
  centeredSlides = [false, false, false],
  offsetBefore,
  offsetAfter,
  peekStart,
  peekEnd,
  speed,
  inertia,
  padding,
  justify,
  align,
  slideClassName,
  wrapperClassName,
  paginationClassName,
  navigationClassName,
  className,
  style,
  scrollBased = false,
  scrollProgress,
  linkState,
  perspective3d,
  parallax,
  animate,
  apiRef,
  onNavigationStateChange,
  onActiveIndexChange,
  onMouseEnter,
  onMouseLeave,
  ...props
}: WithRef<CarouselProps, HTMLDivElement>) {
  'use no memo';

  const carousel = useCarousel(ref, {
    children, carouselId: explicitCarouselId, slidesPerView, orientation, effect, navigation, pagination,
    autoplay, mousewheel, drag, initialSlide, loop, centeredSlides, offsetBefore, offsetAfter, peekStart,
    peekEnd, speed, scrollBased, perspective3d, parallax, apiRef, onNavigationStateChange, onActiveIndexChange, inertia,
    scrollProgress, paginationClassName, navigationClassName, animate,
  });

  const slidesPerViewClasses = c.key('slides-per-view', carousel.layout.slidesPerViewKey as ResponsiveValue<string>, (key) => key);

  return (
    <div
      ref={carousel.root.ref}
      data-carousel-root
      data-carousel-id={carousel.root.id}
      data-scroll-based={scrollBased ? 'true' : 'false'}
      {...stateLinkProps(linkState, composeInteractionHandlers(carousel.root.motionHandlers, { onMouseEnter, onMouseLeave }))}
      className={cx(
          styles.Carousel,
          ...c.value('gap', gap),
          ...c.value('p', padding),
          ...c.value('w', w),
          ...c.value('minW', minW),
          ...c.value('maxW', maxW),
          ...c.value('h', h),
          ...c.value('minH', minH),
          ...c.value('maxH', maxH),
          ...c.value('ratio', aspectRatio),
          ...c.value('grow', grow),
          ...slidesPerViewClasses,
          className,
      )}
      style={{
        ...(carousel.root.motionStyle ?? null),
        ...style,
      }}
      {...carousel.root.revealAttrs}
      {...props}
    >
      <SwiperRoot
          key={carousel.engine.key}
          {...carousel.engine.props}
          className={cx(styles.wrapper, wrapperClassName)}
      >
        {carousel.slides.map((slide, index) => (
          <SwiperSlide
            key={`slide-${index}`}
            className={cx(
              styles.slide,
              ...c.value('justify', justify),
              ...c.value('align', align),
              slideClassName
            )}
          >
            {slide}
          </SwiperSlide>
        ))}
      </SwiperRoot>
    </div>
  );
}
