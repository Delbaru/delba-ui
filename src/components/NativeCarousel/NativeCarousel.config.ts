import { motionCarousel } from '../../core/base/motion-config';

export const NATIVE_CAROUSEL_DEFAULTS = {
    ...motionCarousel,
    slidesPerView: [1, 1, 1],
    gap: [0, 0, 0],
    orientation: [motionCarousel.orientation, motionCarousel.orientation, motionCarousel.orientation],
} as const;
