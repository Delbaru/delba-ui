'use client';

import { cx } from '#core';
import { Flex } from '../../Flex';
import { CAROUSEL_PROGRESS_FILL } from './CarouselProgress.config';
import { useCarouselProgress } from './CarouselProgress.model';
import styles from './CarouselProgress.module.scss';

import type { CarouselProgressProps } from './CarouselProgress.types';

/** A leaf indicator: timing updates mutate only its fill, never render the gallery each frame. */
export function CarouselProgress({ controller, fill = CAROUSEL_PROGRESS_FILL, ref, className, ...props }: CarouselProgressProps) {
    const progress = useCarouselProgress({ controller, ref });

    return <Flex
        {...props}
        ref={progress.rootRef}
        className={cx(styles.CarouselProgress, className)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
    >
        <Flex
            ref={progress.fillRef}
            w={['100%', '100%', '100%']}
            h={['100%', '100%', '100%']}
            bg={[fill, fill, fill]}
            className={styles.fill}
        />
    </Flex>;
}
