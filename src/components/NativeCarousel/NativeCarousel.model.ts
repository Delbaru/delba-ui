'use client';

import { UI_MESSAGES, formatUiMessage } from '../../core/base/messages';

import { Children, isValidElement, useId, useLayoutEffect, useMemo, useRef } from 'react';
import { composeEventHandlers, createLayoutClasses, cx, resolveResponsiveInput, useMergedRefs, type ResponsiveValue, type WithRef } from '#core';
import { useMotionTime } from '../../hooks/useMotionTime';
import { createNativeCarousel, type NativeCarouselOptions } from './engine';
import { useCarouselController, useCarouselSnapshot } from './useCarouselController';
import styles from './NativeCarousel.module.scss';
import { NATIVE_CAROUSEL_DEFAULTS } from './NativeCarousel.config';
import type { NativeCarouselProps } from './NativeCarousel.types';

const c = createLayoutClasses(styles);

export function useNativeCarousel({
    ref,
    children,
    label,
    controller: externalController,
    carouselId,
    slidesPerView = NATIVE_CAROUSEL_DEFAULTS.slidesPerView,
    gap = NATIVE_CAROUSEL_DEFAULTS.gap,
    drag = NATIVE_CAROUSEL_DEFAULTS.drag,
    rewind = NATIVE_CAROUSEL_DEFAULTS.rewind,
    loop = NATIVE_CAROUSEL_DEFAULTS.loop,
    orientation = NATIVE_CAROUSEL_DEFAULTS.orientation,
    mousewheel = NATIVE_CAROUSEL_DEFAULTS.mousewheel,
    initialIndex = 0,
    speed,
    easing,
    autoplay = NATIVE_CAROUSEL_DEFAULTS.autoplay,
    autoplayDelay,
    onIndexChange,
    inertia = NATIVE_CAROUSEL_DEFAULTS.inertia,
    pauseInactiveMedia = NATIVE_CAROUSEL_DEFAULTS.pauseInactiveMedia,
    slideClassName,
    className,
    onKeyDown,
    onPointerDown,
    ...props
}: WithRef<NativeCarouselProps, HTMLDivElement>) {
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
    const momentumEnabled = Boolean(inertia);
    const maxSlides = typeof inertia === 'object' ? inertia.maxSlides : undefined;
    const minimumVelocity = typeof inertia === 'object' ? inertia.minimumVelocity : undefined;
    const settings = useMemo<NativeCarouselOptions>(() => ({
        count: slides.length, initialIndex, duration, easing, drag, rewind, loop, mousewheel,
        autoplay, delay, onIndexChange, contentKey, pauseInactiveMedia,
        inertia: { enabled: momentumEnabled, duration: inertiaDuration, maxSlides, minimumVelocity },
    }), [slides.length, initialIndex, duration, easing, drag, rewind, loop, mousewheel, autoplay, delay, onIndexChange, contentKey, pauseInactiveMedia, momentumEnabled, inertiaDuration, maxSlides, minimumVelocity]);
    const options = useRef(settings);
    const responsiveSignature = String(slidesPerView) + ':' + String(gap) + ':' + String(orientation);
    useLayoutEffect(() => {
        options.current = settings;
        engine.current?.update();
    }, [settings, responsiveSignature]);
    useLayoutEffect(() => {
        if (!root.current || !viewport.current || !track.current) return;
        const driver = createNativeCarousel(root.current, viewport.current, track.current, controller, () => options.current);
        engine.current = driver;
        return () => { driver.destroy(); engine.current = null; };
    }, [controller]);
    const rootRef = useMergedRefs(root, ref);
    const perView = resolveResponsiveInput(slidesPerView).map(value => value == null ? null : String(value).replace('.', '-'));
    return {
        root: {
            ...props,
            ref: rootRef,
            role: 'region' as const,
            'aria-roledescription': 'карусель',
            'aria-label': label,
            tabIndex: props.tabIndex ?? 0,
            onKeyDown: composeEventHandlers(onKeyDown, event => engine.current?.keyboard(event.nativeEvent), { cancelable: true }),
            onPointerDown: composeEventHandlers(onPointerDown, event => engine.current?.pointerDown(event.nativeEvent), { cancelable: true }),
            'data-carousel-root': true,
            'data-carousel-id': carouselId ?? generatedId,
            'data-native-carousel': true,
            'data-draggable': drag ? 'true' : 'false',
            gap,
            className: cx(
                styles.NativeCarousel,
                ...c.key('slides-per-view', perView as ResponsiveValue<string>, value => value),
                ...c.key('orientation', orientation, value => value),
                className,
            ),
        },
        viewport,
        track,
        slides: slides.map((slide, index) => ({
            key: isValidElement(slide) ? slide.key ?? index : index,
            label: formatUiMessage(UI_MESSAGES.carousel.slide, { index: index + 1, count: slides.length }),
            content: slide,
        })),
        slideClass: cx(styles.Slide, slideClassName),
        announcement: {
            'aria-live': snapshot.playing ? 'off' as const : 'polite' as const,
            content: snapshot.pageCount > 0
                ? formatUiMessage(UI_MESSAGES.carousel.position, { index: snapshot.index + 1, count: snapshot.pageCount })
                : '',
        },
    };
}
