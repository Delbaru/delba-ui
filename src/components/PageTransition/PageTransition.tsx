'use client';

import * as React from 'react';
import { motionDefaults } from '../../core/base/motion-config';
import { motionDistanceCss } from '../../core/base/distance';
import { readMotionTimeMs } from '../../core/base/timing';
import { prefersReducedMotion } from '../../core/base/motion';
import { motionEasing } from '../../core/base/easing';
import type { PageTransitionProps } from './PageTransition.types';
import { snapshotSelector } from './snapshot';
import './PageTransition.scss';

/** Native React snapshots preserve the router tree; no cloned DOM, remount or transition timer. */
export function PageTransition({ children, location, name, animate }: PageTransitionProps) {
    const id = React.useId();
    const previous = React.useRef(location);
    const changed = previous.current !== location;
    React.useLayoutEffect(() => { previous.current = location; }, [location]);
    const update = (instance: React.ViewTransitionInstance) => {
        if (!changed || prefersReducedMotion()) return;
        const duration = readMotionTimeMs(animate.duration ?? motionDefaults.pageTransition.duration);
        const distance = animate.effect === 'up'
            ? motionDistanceCss(animate.distance ?? motionDefaults.pageTransition.distance)
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
        return () => { oldPage.cancel(); newPage.cancel(); };
    };
    const Boundary = React.ViewTransition;
    if (!Boundary) return <>{children}</>;
    return (
        <Boundary name={name ?? id} default="none" update="ui-page-transition" onUpdate={update}>
            {children}
        </Boundary>
    );
}
