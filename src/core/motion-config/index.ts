import {
    SCROLL_DEFAULTS,
    MOTION_TIMING_DEFAULTS,
    resolveMotionDefaults,
    type RuntimeMotionConfig,
} from '../base/motion-defaults';
import { DEFAULT_EASING_ROLES } from '../base/easing';
/** Fallback when the config generator has not run yet; generated sibling file takes precedence. */
export const MOTION_CONFIG: RuntimeMotionConfig = {
    timing: MOTION_TIMING_DEFAULTS,
    defaults: resolveMotionDefaults(),
    easing: DEFAULT_EASING_ROLES,
    inView: {
        rootMargin: '0px',
        threshold: 0,
    },
    scroll: SCROLL_DEFAULTS,
};
