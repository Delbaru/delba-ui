'use client';

import { useEffect, useState } from 'react';
import { MEDIA_QUERY } from '../base/breakpoints';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { completeAsyncPhase, syncAsyncPhase, type AsyncPhase } from './Phase';

export function useAsyncPresence(pending: boolean, timing: { delay?: number; hide?: number } = {}) {
    const reduced = useMediaQuery(MEDIA_QUERY.reducedMotion);
    const [phase, setPhase] = useState<AsyncPhase>(pending ? 'waiting' : 'idle');
    const next = syncAsyncPhase(phase, pending, reduced);
    if (next !== phase) setPhase(next);
    const duration = next === 'waiting' ? timing.delay ?? 0 : timing.hide ?? 0;
    useEffect(() => {
        if (next !== 'waiting' && next !== 'leaving') return;
        const timer = setTimeout(() => setPhase(current => completeAsyncPhase(current)), duration);
        return () => clearTimeout(timer);
    }, [next, duration]);
    return next;
}
