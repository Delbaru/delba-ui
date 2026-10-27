import { MOTION_CONFIG } from '../motion-config';
import {
    MOTION_DEFAULTS,
    SCROLL_DEFAULTS,
    resolveMotionDefaults,
    motionDefaultVariable,
    type MotionDefaultGroup,
    type MotionDefaults,
    type RuntimeMotionConfig,
} from './motion-defaults';
import { readMotionTimeMs, type MotionTime } from './timing';
import { DEFAULT_EASING_ROLES, resolveEasingPreset, type MotionEasingRole } from './easing';

// A previous generated artifact may be loaded by ui.config.ts before the first rebuild after an upgrade.
const runtime = MOTION_CONFIG as Partial<RuntimeMotionConfig>;
export const motionDefaults: MotionDefaults = resolveMotionDefaults(runtime.defaults);
export const configuredMotionEasing = (role: MotionEasingRole) =>
    resolveEasingPreset(runtime.easing?.[role] ?? DEFAULT_EASING_ROLES[role]);
export const motionInView = runtime.inView ?? { rootMargin: '0px', threshold: 0 };
export const motionScroll = {
    ...SCROLL_DEFAULTS,
    ...runtime.scroll,
    easing: resolveEasingPreset(runtime.scroll?.easing ?? SCROLL_DEFAULTS.easing),
};
/** CSS and JS resolve the exact same semantic token, including scoped overrides. */
export function readMotionDefaultMs<G extends MotionDefaultGroup>(
    group: G,
    key: keyof MotionDefaults[G] & string,
    scope?: Element,
): number {
    const value =
        scope && typeof getComputedStyle === 'function'
            ? getComputedStyle(scope).getPropertyValue(motionDefaultVariable(group, key)).trim()
            : '';
    const parsed = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/.exec(value);
    if (parsed) return Number(parsed[1]) * (parsed[2] === 's' ? 1000 : 1);
    const fallback = MOTION_DEFAULTS[group][key as keyof (typeof MOTION_DEFAULTS)[G]];
    return readMotionTimeMs(
        motionDefaults[group][key] as MotionTime,
        scope,
        typeof fallback === 'number' ? fallback : 0,
    );
}
