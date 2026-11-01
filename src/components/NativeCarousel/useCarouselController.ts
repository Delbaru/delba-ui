'use client';

import { useState, useSyncExternalStore } from 'react';
import { createCarouselController, INITIAL_NATIVE_CAROUSEL, type NativeCarouselController } from './controller';

/** Stable encapsulated carousel commands; passing this controller never replaces the DOM ref. */
export function useCarouselController(): NativeCarouselController {
    const [controller] = useState(createCarouselController);
    return controller;
}

/** Subscribe only where a counter, playback control or other discrete UI needs state. */
export function useCarouselSnapshot(controller: NativeCarouselController) {
    return useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => INITIAL_NATIVE_CAROUSEL);
}
