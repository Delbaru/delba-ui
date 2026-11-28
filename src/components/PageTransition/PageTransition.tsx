'use client';

import * as React from 'react';
import type {} from 'react/canary';
import { PAGE_TRANSITION_CLASS } from './PageTransition.config';
import { usePageTransition } from './PageTransition.model';
import type { PageTransitionProps } from './PageTransition.types';

/** Native React snapshots preserve the router tree; no cloned DOM, remount or transition timer. */
export function PageTransition({ children, location, name, animate }: PageTransitionProps) {
    const transition = usePageTransition(location, animate.change);
    const Boundary = React.ViewTransition;
    if (!Boundary) return <>{children}</>;
    return (
        <Boundary name={name ?? transition.id} default="none" update={PAGE_TRANSITION_CLASS} onUpdate={transition.update}>
            {children}
        </Boundary>
    );
}
