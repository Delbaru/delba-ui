'use client';

import { Text } from '../../Text';
import { useCarouselTimer } from './CarouselTimer.model';
import type { CarouselTimerProps } from './CarouselTimer.types';

/** Imperative timing text. Updates preserve focus and do not use a live region. */
export function CarouselTimer({ controller, format, ...props }: CarouselTimerProps) {
    const timer = useCarouselTimer({ controller, format });

    return (
        <Text {...props}>
            <span ref={timer.setNode}>{timer.initialText}</span>
        </Text>
    );
}
