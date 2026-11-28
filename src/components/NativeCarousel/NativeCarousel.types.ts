import type { ReactNode } from 'react';
import type { ResponsiveValue } from '#core';
import type { FlexProps } from '../Flex';
import type { MotionTime } from '../../core/base/timing';
import type { MotionEasingPreset } from '../../core/base/easing';
import type { NativeCarouselController } from './controller';
import type { NativeSlidesPerView } from './geometry';
import type { NativeCarouselInertiaOptions } from './inertia';

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
