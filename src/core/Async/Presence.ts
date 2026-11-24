'use client';

import { useLayoutEffect, useState } from 'react';
import { MEDIA_QUERY } from '../base/breakpoints';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { completeAsyncPhase, syncAsyncPhase, type AsyncPhase } from './Phase';

export function useAsyncPresence(pending: boolean, timing: { delay?: number; hide?: number } = {}, enabled = true) {
    const reduced = useMediaQuery(MEDIA_QUERY.reducedMotion, enabled);
    const [phase, setPhase] = useState<AsyncPhase>(pending ? 'waiting' : 'idle');
    const next = enabled ? syncAsyncPhase(phase, pending, reduced) : 'idle';
    if (next !== phase) setPhase(next);
    const duration = next === 'waiting' ? timing.delay ?? 0 : timing.hide ?? 0;
    useLayoutEffect(() => {
        if (!enabled || (next !== 'waiting' && next !== 'leaving')) return;
        const timer = setTimeout(() => setPhase(current => current === next ? completeAsyncPhase(current) : current), duration);
        return () => clearTimeout(timer);
    }, [next, duration, enabled]);
    return next;
}
