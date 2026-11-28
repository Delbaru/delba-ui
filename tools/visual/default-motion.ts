import {
    MOTION_DEFAULTS,
    MOTION_TIMING_DEFAULTS,
    CAROUSEL_BEHAVIOR_DEFAULTS,
    SCROLL_DEFAULTS,
} from '../../src/core/base/motion-defaults';
import { DEFAULT_EASING_ROLES } from '../../src/core/base/easing';
import type { FrontendMotion } from '../config';

/** Explicit author preset. The module never inserts it into an incomplete configuration. */
export const defaultMotion = {
    timing: { ...MOTION_TIMING_DEFAULTS },
    distance: {},
    defaults: { ...MOTION_DEFAULTS },
    carousel: { ...CAROUSEL_BEHAVIOR_DEFAULTS },
    easing: { ...DEFAULT_EASING_ROLES },
    visibility: { rootMargin: '100% 0px' },
    inView: { rootMargin: '0px', threshold: 0 },
    scroll: { ...SCROLL_DEFAULTS },
} as const satisfies FrontendMotion;
