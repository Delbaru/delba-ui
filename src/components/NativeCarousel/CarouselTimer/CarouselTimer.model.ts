'use client';

import { useEffect, useState } from 'react';
import { INITIAL_CAROUSEL_PLAYBACK } from '../playback';
import { formatRemainingSeconds } from './CarouselTimer.config';
import type { CarouselTimerProps } from './CarouselTimer.types';

export function useCarouselTimer({
    controller, format = formatRemainingSeconds,
}: Pick<CarouselTimerProps, 'controller' | 'format'>) {
    const [node, setNode] = useState<HTMLSpanElement | null>(null);
    useEffect(() => {
        if (!node) return;
        const update = () => {
            const value = format(controller.getPlaybackSnapshot());
            if (node.textContent !== value) node.textContent = value;
        };
        update();
        return controller.subscribePlayback(update);
    }, [controller, format, node]);
    return { setNode, initialText: format(INITIAL_CAROUSEL_PLAYBACK) };
}
