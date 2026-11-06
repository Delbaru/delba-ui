import type { ReactNode } from 'react';
import type { MotionTime } from '../../core/base/timing';
import type { MotionDistance } from '../../core/base/distance';

export type PageTransitionAnimate = {
    when: 'change';
    effect: 'fade' | 'up';
    duration?: MotionTime;
    distance?: MotionDistance;
};

export type PageTransitionProps = {
    children: ReactNode;
    /** Router pathname; query and hash updates keep the current page still. */
    location: string;
    /** A unique snapshot name when several boundaries are mounted. */
    name?: string;
    animate: PageTransitionAnimate;
};
