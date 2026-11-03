'use client';

import { useEffect, useRef, useState, type Ref } from 'react';
import { cx, useMergedRefs } from '../../../core';
import { Flex, type FlexProps } from '../../Flex';
import type { NativeCarouselController } from '../controller';
import styles from './CarouselProgress.module.scss';

export interface CarouselProgressProps extends Omit<FlexProps, 'children'> {
    /** The same controller passed to NativeCarousel. */
    controller: NativeCarouselController;
    /** Progress fill colour; defaults to inherited currentColor. */
    fill?: string;
    /** DOM ref of the outer progress bar. */
    ref?: Ref<HTMLElement>;
}

/** A leaf indicator: timing updates mutate only its fill, never render the gallery each frame. */
export function CarouselProgress({ controller, fill = 'currentColor', ref, className, ...props }: CarouselProgressProps) {
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
    return <Flex
        {...props}
        ref={mergedRef}
        className={cx(styles.CarouselProgress, className)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
    >
        <Flex
            ref={bar}
            w={['100%', '100%', '100%']}
            h={['100%', '100%', '100%']}
            bg={[fill, fill, fill]}
            className={styles.fill}
        />
    </Flex>;
}
