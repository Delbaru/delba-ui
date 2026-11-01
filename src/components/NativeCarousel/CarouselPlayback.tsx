'use client';

import { useEffect, useRef, useState, type Ref } from 'react';
import { useMergedRefs } from '../../core/useMergedRefs';
import { Flex, type FlexProps } from '../Flex';
import { Text, type TextProps } from '../Text';
import type { NativeCarouselController } from './controller';
import { INITIAL_CAROUSEL_PLAYBACK, type CarouselPlaybackSnapshot } from './playback';

export interface CarouselProgressProps extends Omit<FlexProps, 'children'> {
    /** The same controller passed to NativeCarousel. */
    controller: NativeCarouselController;
    /** Progress fill colour; defaults to inherited currentColor. */
    fill?: string;
    /** DOM ref of the outer progress bar. */
    ref?: Ref<HTMLElement>;
}

/** A leaf indicator: timing updates mutate only its fill, never render the gallery each frame. */
export function CarouselProgress({ controller, fill = 'currentColor', ref, ...props }: CarouselProgressProps) {
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
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
    >
        <Flex
            ref={bar}
            w={['100%', '100%', '100%']}
            h={['100%', '100%', '100%']}
            style={{ backgroundColor: fill, transform: 'scaleX(0)', transformOrigin: 'left center' }}
        />
    </Flex>;
}

export interface CarouselTimerProps extends Omit<TextProps, 'children' | 'format'> {
    /** The same controller passed to NativeCarousel. */
    controller: NativeCarouselController;
    /** Format the current timing snapshot; default is remaining seconds rounded upward. */
    format?: (snapshot: CarouselPlaybackSnapshot) => string;
    /** DOM ref of the text root. */
    ref?: Ref<HTMLElement>;
}

const remainingSeconds = (snapshot: CarouselPlaybackSnapshot) => String(Math.ceil(snapshot.remaining));

/** Imperative timing text. It is deliberately not a live region; updates do not move focus. */
export function CarouselTimer({ controller, format = remainingSeconds, ref, ...props }: CarouselTimerProps) {
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
    return <Text {...props} ref={ref}><span ref={setNode}>{format(INITIAL_CAROUSEL_PLAYBACK)}</span></Text>;
}
