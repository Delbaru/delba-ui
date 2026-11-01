'use client';

import { Children, isValidElement, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { composeEventHandlers, createLayoutClasses, cx, resolveResponsive, useMergedRefs, type ResponsiveValue, type WithRef } from '../../core';
import { Flex, type FlexProps } from '../Flex';
import { useMotionTime } from '../../hooks/useMotionTime';
import type { MotionTime } from '../../core/base/timing';
import type { MotionEasingPreset } from '../../core/base/easing';
import { createNativeCarousel, type NativeCarouselOptions } from './engine';
import type { NativeCarouselController } from './controller';
import type { NativeSlidesPerView } from './geometry';
import { useCarouselController, useCarouselSnapshot } from './useCarouselController';
import styles from './NativeCarousel.module.scss';
import type { NativeCarouselInertiaOptions } from './inertia';
import { motionCarousel } from '../../core/base/motion-config';

export interface NativeCarouselProps extends Omit<FlexProps, 'children' | 'onChange' | 'dir' | 'wrap' | 'gap' | 'as' | 'href' | 'target' | 'rel' | 'download'> {
    /** Source slides. Each child remains one mounted instance, including interactive media. */
    children: ReactNode;
    /** Accessible name for the carousel region. */
    label: string;
    /** Stable command/state owner; omit to create an internal controller. */
    controller?: NativeCarouselController;
    /** Connect existing CarouselDots/CarouselNav outside this component. */
    carouselId?: string;
    /** Visible slides on [desktop, mobile, tablet]. Fractional values reveal the next slide. */
    slidesPerView?: ResponsiveValue<NativeSlidesPerView>;
    /** Gap between slides in the design units used by the ordinary layout API. */
    gap?: ResponsiveValue<number>;
    /** Allow dragging along the configured axis. Cross-axis touch gestures keep their native behavior. */
    drag?: boolean;
    /** Wrap commands from the final page to the first. This is a visible rewind, not an infinite loop. */
    rewind?: boolean;
    /** Continuous wrapping without cloned children. Requires more slides than ceil(slidesPerView); inspect snapshot.looping. */
    loop?: boolean;
    /** Direction on [desktop, mobile, tablet]. A vertical carousel needs a constrained height. */
    orientation?: ResponsiveValue<'horizontal' | 'vertical'>;
    /** Advance using the mouse wheel; finite ends release the gesture to the page. */
    mousewheel?: boolean;
    /** Momentum after drag release; inherits motion.carousel.inertia. true uses configured bounded projection. */
    inertia?: boolean | NativeCarouselInertiaOptions;
    /** Initial reachable page, clamped to the available content. */
    initialIndex?: number;
    /** Transition duration in seconds or a configured timing name. */
    speed?: MotionTime;
    /** Shared motion easing preset. */
    easing?: MotionEasingPreset;
    /** Override motion.carousel.autoplay. Advances while visible, unfocused and not hovered; respects reduced motion. */
    autoplay?: boolean;
    /** Override motion.defaults.carousel.autoplayDelay; seconds or a timing name, bounded by autoplayMinimumDuration. */
    autoplayDelay?: MotionTime;
    /** Logical page change, including arrows, keyboard, dragging, rewind and external commands. */
    onIndexChange?: (index: number) => void;
    /** Pause native audio/video when their source slide leaves the visible range. Never restarts media automatically. */
    pauseInactiveMedia?: boolean;
    /** Styling hook for every source slide; layout still belongs to the carousel. */
    slideClassName?: string;
}

const c = createLayoutClasses(styles);

/** Own track implementation. Does not load Swiper or duplicate interactive children. */
export function NativeCarousel({ ref, children, label, controller: externalController, carouselId, slidesPerView = [1, 1, 1],
    gap = [0, 0, 0], drag = motionCarousel.drag, rewind = motionCarousel.rewind, loop = motionCarousel.loop,
    orientation = [motionCarousel.orientation, motionCarousel.orientation, motionCarousel.orientation], mousewheel = motionCarousel.mousewheel,
    initialIndex = 0, speed, easing, autoplay = motionCarousel.autoplay, autoplayDelay,
    onIndexChange, inertia = motionCarousel.inertia, pauseInactiveMedia = motionCarousel.pauseInactiveMedia, slideClassName, className, onKeyDown, onPointerDown, ...props }: WithRef<NativeCarouselProps, HTMLDivElement>) {
    const internalController = useCarouselController();
    const controller = externalController ?? internalController;
    const snapshot = useCarouselSnapshot(controller);
    const generatedId = useId();
    const root = useRef<HTMLDivElement | null>(null);
    const viewport = useRef<HTMLDivElement | null>(null);
    const track = useRef<HTMLDivElement | null>(null);
    const engine = useRef<ReturnType<typeof createNativeCarousel> | null>(null);
    const slides = Children.toArray(children);
    const contentKey = slides.map((slide, index) => isValidElement(slide) ? slide.key ?? index : index).join('|');
    const duration = useMotionTime('carousel', 'duration', root, speed);
    const delay = useMotionTime('carousel', 'autoplayDelay', root, autoplayDelay);
    const inertiaDuration = useMotionTime('carousel', 'inertiaDuration', root, typeof inertia === 'object' ? inertia.duration : undefined);
    const momentum = {
        enabled: Boolean(inertia), duration: inertiaDuration,
        maxSlides: typeof inertia === 'object' ? inertia.maxSlides : undefined,
        minimumVelocity: typeof inertia === 'object' ? inertia.minimumVelocity : undefined,
    };
    const options = useRef<NativeCarouselOptions>({ count: slides.length, initialIndex, duration, easing, drag, rewind, loop, mousewheel, autoplay, delay, onIndexChange, contentKey, pauseInactiveMedia, inertia: momentum });
    const responsiveSignature = `${String(slidesPerView)}:${String(gap)}:${String(orientation)}`;
    useLayoutEffect(() => {
        options.current = { count: slides.length, initialIndex, duration, easing, drag, rewind, loop, mousewheel, autoplay, delay, onIndexChange, contentKey, pauseInactiveMedia, inertia: momentum };
        engine.current?.update();
    }, [slides.length, initialIndex, duration, easing, drag, rewind, loop, mousewheel, autoplay, delay, onIndexChange, responsiveSignature, contentKey, pauseInactiveMedia, inertiaDuration, momentum.enabled, momentum.maxSlides, momentum.minimumVelocity]);
    useLayoutEffect(() => {
        if (!root.current || !viewport.current || !track.current) return;
        const driver = createNativeCarousel(root.current, viewport.current, track.current, controller, () => options.current);
        engine.current = driver;
        return () => { driver.destroy(); engine.current = null; };
    }, [controller]);
    const rootRef = useMergedRefs(root, ref);
    const perView = resolveResponsive(slidesPerView).map(value => value == null ? null : String(value).replace('.', '-'));
    return <Flex
        {...props}
        ref={rootRef}
        role="region"
        aria-roledescription="карусель"
        aria-label={label}
        tabIndex={props.tabIndex ?? 0}
        onKeyDown={composeEventHandlers(onKeyDown, event => engine.current?.keyboard(event.nativeEvent), { cancelable: true })}
        onPointerDown={composeEventHandlers(onPointerDown, event => engine.current?.pointerDown(event.nativeEvent), { cancelable: true })}
        data-carousel-root
        data-carousel-id={carouselId ?? generatedId}
        data-native-carousel
        data-draggable={drag ? 'true' : 'false'}
        gap={gap}
        className={cx(styles.Root, ...c.key('slides-per-view', perView as ResponsiveValue<string>, value => value), ...c.key('orientation', orientation, value => value), className)}
    >
        <div ref={viewport} className={styles.Viewport}>
            <div ref={track} className={styles.Track}>
                {slides.map((slide, index) => <div
                    key={isValidElement(slide) ? slide.key ?? index : index}
                    className={cx(styles.Slide, slideClassName)}
                    role="group"
                    aria-roledescription="слайд"
                    aria-label={`${index + 1} из ${slides.length}`}
                >{slide}</div>)}
            </div>
        </div>
        <span
            className={styles.Announcement}
            aria-live={snapshot.playing ? 'off' : 'polite'}
            aria-atomic="true"
        >{snapshot.pageCount > 0 ? `Позиция ${snapshot.index + 1} из ${snapshot.pageCount}` : ''}</span>
    </Flex>;
}
