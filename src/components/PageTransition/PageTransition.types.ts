import type { ReactNode } from 'react';
import type { MotionChannels } from '#core/Motion';
import type { MotionTime } from '../../core/base/timing';
import type { MotionDistance } from '../../core/base/distance';

export type PageTransitionAnimate = {
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
    /** Native snapshot effect applied when the location changes. */
    animate: Required<Pick<MotionChannels<{ change: PageTransitionAnimate }>, 'change'>>;
};
