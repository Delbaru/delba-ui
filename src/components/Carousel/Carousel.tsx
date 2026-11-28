'use client';

import { Swiper as SwiperRoot, SwiperSlide } from 'swiper/react';
import type { WithRef } from '#core';
import { MotionLayers } from '#core/Motion';
import { useCarousel } from './Carousel.model';
import type { CarouselProps } from './Carousel.types';

export function Carousel(props: WithRef<CarouselProps, HTMLDivElement>) {
  'use no memo';

  const carousel = useCarousel(props);

  return (
    <div {...carousel.root}>
      <SwiperRoot key={carousel.engine.key} {...carousel.engine.props} className={carousel.wrapperClass}>
        {carousel.slides.map((slide, index) => (
          <SwiperSlide key={`slide-${index}`} className={carousel.slideClass}>
            {slide}
          </SwiperSlide>
        ))}
      </SwiperRoot>
      <MotionLayers effects={carousel.effects} />
    </div>
  );
}
