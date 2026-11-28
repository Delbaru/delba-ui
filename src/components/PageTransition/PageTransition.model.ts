'use client';

import { useId, useLayoutEffect, useRef, type ViewTransitionInstance } from 'react';
import type {} from 'react/canary';
import { motionDefaults } from '../../core/base/motion-config';
import { motionDistanceCss } from '../../core/base/distance';
import { readMotionTimeMs } from '../../core/base/timing';
import { prefersReducedMotion } from '../../core/base/motion';
import { motionEasing } from '../../core/base/easing';
import type { PageTransitionAnimate } from './PageTransition.types';
import { snapshotSelector } from './snapshot';

export function usePageTransition(location: string, change: PageTransitionAnimate) {
    const id = useId();
    const previous = useRef(location);
    const changed = previous.current !== location;

    useLayoutEffect(() => {
        previous.current = location;
    }, [location]);

    const update = (instance: ViewTransitionInstance) => {
        if (!changed || prefersReducedMotion()) return;

        const duration = readMotionTimeMs(change.duration ?? motionDefaults.pageTransition.duration);
        const distance = change.effect === 'up'
            ? motionDistanceCss(change.distance ?? motionDefaults.pageTransition.distance)
            : '0px';
        const root = document.documentElement;
        const oldPage = root.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration, easing: motionEasing.easeOutCubic.css, fill: 'both',
            pseudoElement: snapshotSelector('old', instance.name),
        });
        const newPage = root.animate([
            { opacity: 0, transform: `translateY(${distance})` },
            { opacity: 1, transform: 'translateY(0)' },
        ], {
            duration, easing: motionEasing.easeOutCubic.css, fill: 'both',
            pseudoElement: snapshotSelector('new', instance.name),
        });
        return () => {
            oldPage.cancel();
            newPage.cancel();
        };
    };
    return { id, update };
}
