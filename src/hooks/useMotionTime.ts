'use client';
import { useLayoutEffect, useState, type RefObject } from 'react';
import {
    MOTION_DEFAULTS,
    type MotionDefaultGroup,
    type MotionDefaults,
} from '../core/base/motion-defaults';
import { motionDefaults, readMotionDefaultMs } from '../core/base/motion-config';
import { motionTimeFallbackMs, readMotionTimeMs, type MotionTime } from '../core/base/timing';

/** Semantic CSS timing and its JS completion clock share one resolved value. */
export function useMotionTime<G extends MotionDefaultGroup>(
    group: G,
    key: keyof MotionDefaults[G] & string,
    scope: RefObject<Element | null>,
    override?: MotionTime,
): number {
    const builtIn = MOTION_DEFAULTS[group][key as keyof (typeof MOTION_DEFAULTS)[G]];
    const fallback = typeof builtIn === 'number' ? builtIn : 0;
    const configured = motionDefaults[group][key];
    const [ms, setMs] = useState(() =>
        motionTimeFallbackMs(override ?? (configured as MotionTime), fallback),
    );
    useLayoutEffect(() => {
        const next =
            override === undefined
                ? readMotionDefaultMs(group, key, scope.current ?? undefined)
                : readMotionTimeMs(override, scope.current ?? undefined, fallback);
        setMs((current) => (current === next ? current : next));
    }, [group, key, scope, override, fallback]);
    return ms;
}
