'use client';
import {
  Children,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Swiper as SwiperInstance } from 'swiper';

import { publishCarouselControlsSnapshot, resetCarouselControlsSnapshot } from './controls';
import { clamp01, createLayoutClasses, cx, type ResponsiveValue, type WithRef } from '#core';
import { useElement } from '#core/Element';
import {
  DEFAULT_NAVIGATION_STATE,
  assignCarouselApiRef,
  getLogicalSlideIndex,
  getPaginationState,
  hasScrollableSlides,
} from './slides';
import type { CarouselApi, CarouselNavigationState, CarouselProps } from './Carousel.types';
import { useMotionTime } from '../../hooks/useMotionTime';
import { carouselLayout } from './Carousel.layout';
import { carouselEngine } from './Carousel.engine';
import { CAROUSEL_SLIDES_PER_VIEW } from './Carousel.config';
import styles from './Carousel.module.scss';

const c = createLayoutClasses(styles);

/** Owns layout measurement, Swiper coordination and root presentation. */
export function useCarousel({
  ref,
  children,
  carouselId: explicitCarouselId,
  gap, slidesPerView = CAROUSEL_SLIDES_PER_VIEW,
  aspectRatio, w, minW, maxW, h, minH, maxH, grow,
  orientation, effect, navigation: navigationInput, pagination: paginationInput,
  autoplay, mousewheel, drag, initialSlide: initialSlideInput, loop, centeredSlides,
  offsetBefore, offsetAfter, peekStart, peekEnd,
  speed, inertia, padding, justify, align,
  slideClassName, wrapperClassName, paginationClassName, navigationClassName,
  className, style, scrollBased = false, scrollProgress,
  linkState, perspective3d, parallax, animate, apiRef,
  onNavigationStateChange, onActiveIndexChange,
  ...dom
}: WithRef<CarouselProps, HTMLDivElement>) {
  'use no memo';

  const slides = useMemo(() => Children.toArray(children), [children]);
  const generatedCarouselId = useId().replace(/:/g, '');
  const carouselId = explicitCarouselId ?? generatedCarouselId;

  const [measurement, setMeasurement] = useState(() => carouselLayout.initial(slidesPerView));

  const rootRef = useRef<HTMLDivElement | null>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const publishedRef = useRef<{ index: number; navigation: CarouselNavigationState | null }>({
    index: 0,
    navigation: null,
  });
  const carouselApiInternalRef = useRef<CarouselApi>({
    prev: () => undefined,
    next: () => undefined,
    goTo: () => undefined,
    getNavigationState: () => DEFAULT_NAVIGATION_STATE,
  });
  const onNavigationStateChangeRef = useRef(onNavigationStateChange);
  const onActiveIndexChangeRef = useRef(onActiveIndexChange);
  const element = useElement({
    ref,
    beforeRefs: [rootRef],
    motion: { perspective3d, parallax, animate },
    style,
    linkState,
    events: [{ handlers: dom }],
  });

  onNavigationStateChangeRef.current = onNavigationStateChange;
  onActiveIndexChangeRef.current = onActiveIndexChange;

  const slidesPerViewKey = useMemo(() => {
    const toKey = (value: number | 'auto') => {
      if (value === 'auto') return 'auto';
      const stringValue = String(value);
      return stringValue.includes('.') ? stringValue.replace('.', '-') : stringValue;
    };

    if (Array.isArray(slidesPerView)) {
      return slidesPerView.map((value) =>
        value === null || value === undefined ? null : toKey(value as number | 'auto'),
      );
    }

    return toKey(slidesPerView as unknown as number | 'auto');
  }, [slidesPerView]);

  // Строка, а не массив: кортеж пропа литералом новый на каждом рендере родителя, и эффект
  // замера с ним в зависимостях переподписывал ResizeObserver на каждом рендере.
  const slidesPerViewSignature = String(slidesPerViewKey);

  const measureResponsiveValues = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const next = carouselLayout.measure(root);
    if (next) setMeasurement((previous) => (carouselLayout.same(previous, next) ? previous : next));
  }, []);

  useLayoutEffect(() => {
    measureResponsiveValues();

    const node = rootRef.current;
    const view = node?.ownerDocument.defaultView;
    if (!node || !view) return;

    const resizeObserver = new view.ResizeObserver(measureResponsiveValues);
    resizeObserver.observe(node);
    view.addEventListener('resize', measureResponsiveValues);

    return () => {
      resizeObserver.disconnect();
      view.removeEventListener('resize', measureResponsiveValues);
    };
  }, [measureResponsiveValues, slidesPerViewSignature, slides.length]);

  const layout = carouselLayout.resolve({
    orientation, effect, navigation: navigationInput, pagination: paginationInput,
    mousewheel, drag, initialSlide: initialSlideInput, loop,
    centeredSlides, offsetBefore, offsetAfter, peekStart, peekEnd, speed, scrollBased,
  }, measurement);
  const { loop: requestedLoop, initialSlide, navigation, pagination } = layout;
  const slidePlan = useMemo(
    () =>
      carouselLayout.slides(
        slides,
        {
          loop: requestedLoop,
          initialSlide,
          navigation,
          pagination,
        },
        measurement.slidesPerView,
      ),
    [slides, requestedLoop, initialSlide, navigation, pagination, measurement.slidesPerView],
  );
  const currentSpeed = useMotionTime('carousel', 'duration', rootRef, layout.speed);
  const autoplayDelay = useMotionTime(
    'carousel',
    'autoplayDelay',
    rootRef,
    typeof autoplay === 'object' ? autoplay.delay : undefined,
  );
  const [status, setStatus] = useState(() => ({
    navigation: DEFAULT_NAVIGATION_STATE,
    index: slides.length > 0 ? ((initialSlide % slides.length) + slides.length) % slides.length : 0,
  }));
  const { navigation: navigationState, index: activeIndex } = status;

  const getNavigationState = useCallback(
    (swiper: SwiperInstance | null): CarouselNavigationState => {
      if (!swiper || !hasScrollableSlides(slides.length, measurement.slidesPerView)) {
        return DEFAULT_NAVIGATION_STATE;
      }

      if (slidePlan.loop || slidePlan.usesPaddedLoop) {
        return {
          isBeginning: false,
          isEnd: false,
          prevDisabled: false,
          nextDisabled: false,
        };
      }

      return {
        isBeginning: swiper.isBeginning,
        isEnd: swiper.isEnd,
        prevDisabled: swiper.isBeginning,
        nextDisabled: swiper.isEnd,
      };
    },
    [measurement.slidesPerView, slidePlan.loop, slides.length, slidePlan.usesPaddedLoop],
  );

  const normalizePaddedLoopPosition = useCallback(
    (swiper: SwiperInstance | null) => {
      if (!swiper || !slidePlan.usesPaddedLoop || slides.length === 0) return;

      const leftBoundary = slides.length * slidePlan.middleCycleIndex;
      const rightBoundary = slides.length * (slidePlan.middleCycleIndex + 1);

      if (swiper.activeIndex < leftBoundary) {
        swiper.slideTo(swiper.activeIndex + slides.length, 0, false);
        return;
      }

      if (swiper.activeIndex >= rightBoundary) {
        swiper.slideTo(swiper.activeIndex - slides.length, 0, false);
      }
    },
    [slidePlan.middleCycleIndex, slides.length, slidePlan.usesPaddedLoop],
  );

  const publishState = useCallback(
    (swiper: SwiperInstance | null, force = false) => {
      const index = getLogicalSlideIndex(swiper, slides.length, slidePlan.loop);
      const navigation = getNavigationState(swiper);
      const previous = publishedRef.current;
      const indexChanged = previous.index !== index;
      const navigationChanged =
        !previous.navigation ||
        previous.navigation.isBeginning !== navigation.isBeginning ||
        previous.navigation.isEnd !== navigation.isEnd ||
        previous.navigation.prevDisabled !== navigation.prevDisabled ||
        previous.navigation.nextDisabled !== navigation.nextDisabled;

      if (!force && !indexChanged && !navigationChanged) return;
      publishedRef.current = { index, navigation };
      setStatus({ index, navigation });
      if (indexChanged) onActiveIndexChangeRef.current?.(index);
      if (force || navigationChanged) onNavigationStateChangeRef.current?.(navigation);
    },
    [getNavigationState, slidePlan.loop, slides.length],
  );

  const prev = useCallback(() => {
    swiperRef.current?.slidePrev(currentSpeed);
  }, [currentSpeed]);

  const next = useCallback(() => {
    swiperRef.current?.slideNext(currentSpeed);
  }, [currentSpeed]);

  const goTo = useCallback(
    (index: number) => {
      const swiper = swiperRef.current;
      if (!swiper || slides.length === 0) return;

      if (slidePlan.loop && typeof swiper.slideToLoop === 'function') {
        swiper.slideToLoop(index, currentSpeed);
        return;
      }

      const targetIndex = slidePlan.usesPaddedLoop
        ? index + slides.length * slidePlan.middleCycleIndex
        : index;

      swiper.slideTo(targetIndex, currentSpeed);
    },
    [
      currentSpeed,
      slidePlan.loop,
      slidePlan.middleCycleIndex,
      slides.length,
      slidePlan.usesPaddedLoop,
    ],
  );

  carouselApiInternalRef.current.prev = prev;
  carouselApiInternalRef.current.next = next;
  carouselApiInternalRef.current.goTo = goTo;
  carouselApiInternalRef.current.getNavigationState = () => getNavigationState(swiperRef.current);

  useEffect(() => {
    const paginationState = getPaginationState(
      swiperRef.current,
      slides.length,
      measurement.slidesPerView,
      slidePlan.loop,
      slidePlan.usesPaddedLoop,
    );

    publishCarouselControlsSnapshot(rootRef.current, {
      api: carouselApiInternalRef.current,
      navigationState,
      activeIndex,
      slideCount: slides.length,
      pageIndex: paginationState.pageIndex,
      pageCount: paginationState.pageCount,
      showNavigation: slidePlan.showNavigation,
      showDots: slidePlan.showDots,
      paginationClassName,
      navigationClassName,
    });
  }, [
    activeIndex,
    navigationClassName,
    paginationClassName,
    measurement.slidesPerView,
    slidePlan.loop,
    navigationState,
    slidePlan.showDots,
    slidePlan.showNavigation,
    slides.length,
    slidePlan.usesPaddedLoop,
  ]);

  useEffect(() => {
    const rootNode = rootRef.current;

    return () => {
      resetCarouselControlsSnapshot(rootNode);
    };
  }, []);

  // Положение ленты при scrollBased задаёт вызывающий: прогресс 0…1 без анимации.
  const scrollProgressRef = useRef(scrollProgress);
  scrollProgressRef.current = scrollBased ? scrollProgress : undefined;

  const applyScrollProgress = useCallback((swiper: SwiperInstance | null) => {
    const progress = scrollProgressRef.current;
    if (swiper && progress !== undefined) swiper.setProgress(clamp01(progress), 0);
  }, []);

  useEffect(() => {
    applyScrollProgress(swiperRef.current);
  }, [applyScrollProgress, scrollBased, scrollProgress]);

  const handleSwiper = useCallback(
    (instance: SwiperInstance) => {
      swiperRef.current = instance;
      applyScrollProgress(instance);
      publishState(instance, true);
    },
    [applyScrollProgress, publishState],
  );

  const handleSwiperUpdate = useCallback(
    (instance: SwiperInstance) => {
      swiperRef.current = instance;
      publishState(instance);
    },
    [publishState],
  );

  const handleSwiperTransitionEnd = useCallback(
    (instance: SwiperInstance) => {
      swiperRef.current = instance;
      normalizePaddedLoopPosition(instance);
      publishState(instance, true);
    },
    [normalizePaddedLoopPosition, publishState],
  );

  useEffect(() => {
    publishState(swiperRef.current, true);
  }, [
    measurement.gap,
    measurement.slidesPerView,
    slidePlan.loop,
    publishState,
    slidePlan.renderedSlides.length,
    slides.length,
    slidePlan.usesPaddedLoop,
  ]);

  useEffect(() => {
    const instance = swiperRef.current;
    if (!instance) return;

    carouselEngine.updateLayout(instance, layout);
    publishState(instance, true);
  }, [
    layout.centered,
    measurement.gap,
    layout.offsetAfter,
    layout.offsetBefore,
    measurement.slidesPerView,
    currentSpeed,
    publishState,
  ]);

  useEffect(() => {
    assignCarouselApiRef(apiRef, carouselApiInternalRef.current);

    return () => {
      assignCarouselApiRef(apiRef, null);
    };
  }, [apiRef]);

  const engineOptions = carouselEngine.options({
    layout,
    measurement,
    slides: slidePlan,
    speed: currentSpeed,
    autoplay,
    autoplayDelay,
    inertia,
  });
  const swiperKey = `${layout.orientation}-${layout.effect}-${Boolean(engineOptions.freeMode)}-${slidePlan.loop}-${slidePlan.usesPaddedLoop}-${String(measurement.slidesPerView)}-${slidePlan.initialSlide}-${slidePlan.renderedSlides.length}-${layout.centered}`;
  const engineProps = {
    ...engineOptions,
    onSwiper: handleSwiper,
    onSlideChange: handleSwiperUpdate,
    onResize: handleSwiperUpdate,
    onBreakpoint: handleSwiperUpdate,
    onLock: handleSwiperUpdate,
    onUnlock: handleSwiperUpdate,
    onReachBeginning: handleSwiperUpdate,
    onReachEnd: handleSwiperUpdate,
    onFromEdge: handleSwiperUpdate,
    onSlideChangeTransitionEnd: handleSwiperTransitionEnd,
  };

  return {
    root: {
      ref: element.ref,
      className: cx(
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
        ...c.key('slides-per-view', slidesPerViewKey as ResponsiveValue<string>, key => key),
        element.className,
        className,
      ),
      style: element.style,
      'data-carousel-root': true,
      'data-carousel-id': carouselId,
      'data-scroll-based': scrollBased ? 'true' : 'false',
      ...element.attributes,
      ...dom,
      ...element.events,
    },
    effects: element.effects,
    wrapperClass: cx(styles.wrapper, wrapperClassName),
    slideClass: cx(styles.slide, ...c.value('justify', justify), ...c.value('align', align), slideClassName),
    engine: { key: swiperKey, props: engineProps },
    slides: slidePlan.renderedSlides,
  };
}
