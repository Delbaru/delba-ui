'use client';

import { useEffect, useRef, useState } from 'react';
import { useMergedRefs } from '#core';
import type { CarouselProgressProps } from './CarouselProgress.types';

export function useCarouselProgress({ controller, ref }: Pick<CarouselProgressProps, 'controller' | 'ref'>) {
    const [root, setRoot] = useState<HTMLElement | null>(null);
    const mergedRef = useMergedRefs<HTMLElement>(ref, setRoot);
    const bar = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!root) return;
        const update = () => {
            const state = controller.getPlaybackSnapshot();
            if (bar.current) bar.current.style.transform = `scaleX(${state.progress})`;
            // Coarse ARIA values avoid announcing a continuously changing frame stream.
            const value = String(Math.round(state.progress * 100));
            if (root.getAttribute('aria-valuenow') !== value) root.setAttribute('aria-valuenow', value);
            root.dataset.paused = String(state.paused);
            root.dataset.playing = String(state.playing);
        };
        update();
        return controller.subscribePlayback(update);
    }, [controller, root]);
    return { rootRef: mergedRef, fillRef: bar };
}
