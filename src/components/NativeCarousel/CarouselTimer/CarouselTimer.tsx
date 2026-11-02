'use client';

import { useEffect, useState, type Ref } from 'react';
import { cx } from '../../../core';
import { Text, type TextProps } from '../../Text';
import type { NativeCarouselController } from '../controller';
import { INITIAL_CAROUSEL_PLAYBACK, type CarouselPlaybackSnapshot } from '../playback';
import styles from './CarouselTimer.module.scss';

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
export function CarouselTimer({ controller, format = remainingSeconds, ref, className, ...props }: CarouselTimerProps) {
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
    return <Text
        {...props}
        ref={ref}
        className={cx(styles.CarouselTimer, 'CarouselTimer', className)}
    ><span ref={setNode}>{format(INITIAL_CAROUSEL_PLAYBACK)}</span></Text>;
}
