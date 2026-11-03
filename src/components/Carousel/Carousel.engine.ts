import type { Swiper as SwiperInstance } from 'swiper';
import type { SwiperProps } from 'swiper/react';
import {
  A11y,
  Autoplay,
  EffectCoverflow,
  EffectCube,
  EffectFade,
  EffectFlip,
  FreeMode,
  Mousewheel,
} from 'swiper/modules';
import { UI_MESSAGES } from '../../core/base/messages';
import type { CarouselAutoplay } from './types';
import type {
  CarouselMeasurement,
  CarouselResolvedLayout,
  CarouselSlidePlan,
} from './Carousel.layout';

const EFFECT_MODULES = {
  fade: EffectFade,
  cube: EffectCube,
  coverflow: EffectCoverflow,
  flip: EffectFlip,
} as const;

interface EngineOptions {
  layout: CarouselResolvedLayout;
  measurement: CarouselMeasurement;
  slides: CarouselSlidePlan;
  speed: number;
  autoplay: CarouselAutoplay | undefined;
  autoplayDelay: number;
  inertia: number | undefined;
}

/** Swiper translation only: no React state or second engine lifecycle. */
export const carouselEngine = {
  options({ layout, measurement, slides, speed, autoplay, autoplayDelay, inertia }: EngineOptions) {
    const freeMode =
      inertia && inertia > 0
        ? { enabled: true, momentum: true, momentumRatio: inertia, sticky: true }
        : false;
    const autoplayOptions = autoplay
      ? {
          delay: autoplayDelay,
          disableOnInteraction:
            typeof autoplay === 'object' ? (autoplay.disableOnInteraction ?? true) : true,
          pauseOnMouseEnter: true,
        }
      : false;
    const modules = [A11y];
    if (autoplayOptions) modules.push(Autoplay);
    if (layout.mousewheel) modules.push(Mousewheel);
    if (freeMode) modules.push(FreeMode);
    if (layout.effect !== 'slide') modules.push(EFFECT_MODULES[layout.effect]);

    return {
      modules,
      a11y: {
        enabled: true,
        prevSlideMessage: UI_MESSAGES.carousel.previous,
        nextSlideMessage: UI_MESSAGES.carousel.next,
      },
      allowTouchMove: layout.drag,
      autoplay: autoplayOptions,
      direction: layout.orientation,
      effect: layout.effect,
      fadeEffect: { crossFade: true },
      cubeEffect: { shadow: false, slideShadows: false },
      coverflowEffect: { slideShadows: false },
      flipEffect: { slideShadows: false },
      freeMode,
      grabCursor: false,
      centeredSlides: layout.centered,
      initialSlide: slides.initialSlide,
      loop: slides.loop,
      mousewheel: layout.mousewheel ? { forceToAxis: true, releaseOnEdges: !slides.loop } : false,
      noSwipingSelector:
        'button, input, textarea, select, option, label, summary, [role="button"], [data-carousel-no-drag]',
      observeParents: true,
      observer: true,
      preventClicks: true,
      preventClicksPropagation: true,
      resizeObserver: true,
      simulateTouch: layout.drag,
      slidesPerView: measurement.slidesPerView,
      slidesOffsetAfter: layout.offsetAfter,
      slidesOffsetBefore: layout.offsetBefore,
      spaceBetween: measurement.gap,
      speed,
      threshold: 6,
      touchStartPreventDefault: layout.drag,
      watchOverflow: true,
    } satisfies SwiperProps;
  },

  updateLayout(instance: SwiperInstance, layout: CarouselResolvedLayout) {
    const patch = {
      centeredSlides: layout.centered,
      slidesOffsetBefore: layout.offsetBefore,
      slidesOffsetAfter: layout.offsetAfter,
    };
    Object.assign(instance.params, patch);
    Object.assign(instance.originalParams, patch);
    instance.update();
    instance.slideTo(instance.activeIndex, 0, false);
  },
};
