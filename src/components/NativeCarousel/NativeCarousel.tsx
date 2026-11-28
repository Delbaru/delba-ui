'use client';

import type { WithRef } from '#core';
import { Flex } from '../Flex';
import { useNativeCarousel } from './NativeCarousel.model';
import type { NativeCarouselProps } from './NativeCarousel.types';
import styles from './NativeCarousel.module.scss';

export function NativeCarousel(props: WithRef<NativeCarouselProps, HTMLDivElement>) {
    const carousel = useNativeCarousel(props);

    return (
        <Flex {...carousel.root}>
            <div ref={carousel.viewport} className={styles.Viewport}>
                <div ref={carousel.track} className={styles.Track}>
                    {carousel.slides.map(slide => (
                        <div
                            key={slide.key}
                            className={carousel.slideClass}
                            role="group"
                            aria-roledescription="слайд"
                            aria-label={slide.label}
                        >
                            {slide.content}
                        </div>
                    ))}
                </div>
            </div>
            <span className={styles.Announcement} aria-live={carousel.announcement['aria-live']} aria-atomic>
                {carousel.announcement.content}
            </span>
        </Flex>
    );
}
