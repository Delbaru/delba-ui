import type { MotionTime } from './timing';
import type { MotionEasingRole, SerializedEasing } from './easing';

/** Tunable behavior defaults. Public durations are seconds; frame counts and safety tolerances stay internal. */
export const MOTION_DEFAULTS = {
    pageTransition: { duration: 0.3, distance: 8 },
    reveal: {
        duration: 0.75,
        distance: 32,
        hold: 3,
    },
    textSlide: {
        duration: 0.4,
        hoverDuration: 0.35,
        sequenceDuration: 1,
    },
    textReveal: {
        duration: 0.3,
        stagger: 0.014,
        maxDuration: 0.5,
        shift: 0.3,
        inDelayFactor: 0.25,
        collapseDelayFactor: 0.5,
    },
    textClip: {
        duration: 1,
    },
    counter: {
        duration: 2.5,
        threshold: 0.1,
    },
    iconSwap: {
        duration: 0.3,
        scale: 0.8,
        rotate: 0,
    },
    iconSpin: {
        duration: 0.18,
        scale: 0.5,
        rotate: 45,
    },
    imgSwap: {
        duration: 0.7,
    },
    grid: {
        duration: 0.4,
        distance: 12,
        stagger: 0,
    },
    skeleton: {
        duration: 1.6,
    },
    carousel: {
        duration: 0.3,
        autoplayDelay: 3,
        autoplayMinimumDuration: 0.1,
        inertiaDuration: 0.6,
        inertiaMinimumDuration: 0.1,
        inertiaMaxSlides: 3,
        inertiaMinimumVelocity: 150,
        dragThreshold: 6,
        dragSampleDuration: 0.1,
        flickDistance: 20,
        flickVelocity: 350,
        edgeResistance: 0.2,
        wheelCooldownDuration: 0.18,
    },
    videoPlayer: {
        autoHideDuration: 2,
        doubleClickDuration: 0.22,
        controlsPollDuration: 0.3,
        volumeStep: 0.05,
        timelineStep: 5,
        timelinePageRatio: 0.1,
        driftTolerance: 0.3,
    },
    buttonIdle: {
        duration: 8,
        strength: 1,
    },
    parallax: {
        distance: 72,
        ease: 0.14,
    },
    marquee: {
        speed: 40,
        easeDuration: 0.7,
    },
    perspective: {
        ease: 0.16,
        restEase: 0.1,
        maxRotateX: 10,
        maxRotateY: 12,
        maxTranslateX: 10,
        maxTranslateY: 10,
        scale: 1.02,
        translateZ: 0,
    },
};
/** Bootstrap only; a project's single scroll owner is motion.scroll. Durations are seconds. */
export const SCROLL_DEFAULTS = {
    lerp: 0.08,
    minDuration: 0.4,
    maxDuration: 1.2,
    durationPerScreen: 0.25,
    offset: 0,
    easing: 'easeOutExpo',
} as const;
/** Starter timing scale; a project's timing entries replace these values or add names. */
export const MOTION_TIMING_DEFAULTS = {
    veryFast: 0.08,
    fast: 0.3,
    normal: 0.5,
    slow: 0.7,
    verySlow: 1,
};
export type MotionDefaultGroup = keyof typeof MOTION_DEFAULTS;
export type MotionDefaults<Time = MotionTime> = {
    [G in MotionDefaultGroup]: {
        [K in keyof (typeof MOTION_DEFAULTS)[G]]: K extends
            | 'duration'
            | 'stagger'
            | 'hold'
            | 'autoplayDelay'
            | `${string}Duration`
            ? Time
            : number;
    };
};
export type MotionDefaultOverrides = {
    readonly [G in MotionDefaultGroup]?: Partial<MotionDefaults[G]>;
};
/** Shared NativeCarousel behavior. Instance props override these defaults; layout remains explicit. */
export interface CarouselBehaviorDefaults {
    drag: boolean;
    rewind: boolean;
    loop: boolean;
    orientation: 'horizontal' | 'vertical';
    mousewheel: boolean;
    autoplay: boolean;
    inertia: boolean;
    pauseInactiveMedia: boolean;
}
export const CAROUSEL_BEHAVIOR_DEFAULTS: CarouselBehaviorDefaults = {
    drag: true, rewind: false, loop: false, orientation: 'horizontal', mousewheel: false,
    autoplay: false, inertia: false, pauseInactiveMedia: true,
};
export const resolveCarouselBehavior = (overrides?: Partial<CarouselBehaviorDefaults>): CarouselBehaviorDefaults =>
    ({ ...CAROUSEL_BEHAVIOR_DEFAULTS, ...overrides });
export interface RuntimeMotionConfig {
    timing: Record<string, number>;
    defaults: MotionDefaults<string | number>;
    carousel: CarouselBehaviorDefaults;
    easing: Record<MotionEasingRole, SerializedEasing>;
    inView: { rootMargin: string; threshold: number };
    scroll: {
        duration?: number;
        lerp: number;
        minDuration: number;
        maxDuration: number;
        durationPerScreen: number;
        offset: string | number;
        easing: SerializedEasing;
    };
}
export function isDefaultTime(key: string): boolean {
    return (
        key === 'duration' ||
        key === 'stagger' ||
        key === 'hold' ||
        key === 'autoplayDelay' ||
        key.endsWith('Duration')
    );
}
export function resolveMotionDefaults(overrides?: {
    readonly [G in MotionDefaultGroup]?: Partial<MotionDefaults<string | number>[G]>;
}): MotionDefaults {
    return Object.fromEntries(
        Object.entries(MOTION_DEFAULTS).map(([group, values]) => [
            group,
            { ...values, ...overrides?.[group as MotionDefaultGroup] },
        ]),
    ) as MotionDefaults;
}
export const motionDefaultVariable = (group: string, key: string): string =>
    `--t-m-${group.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
