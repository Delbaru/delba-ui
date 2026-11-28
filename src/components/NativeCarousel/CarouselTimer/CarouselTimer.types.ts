import type { Ref } from 'react';
import type { TextProps } from '../../Text';
import type { NativeCarouselController } from '../controller';
import type { CarouselPlaybackSnapshot } from '../playback';

export interface CarouselTimerProps extends Omit<TextProps, 'children' | 'format'> {
    /** The same controller passed to NativeCarousel. */
    controller: NativeCarouselController;
    /** Format the current timing snapshot; default is remaining seconds rounded upward. */
    format?: (snapshot: CarouselPlaybackSnapshot) => string;
    /** DOM ref of the text root. */
    ref?: Ref<HTMLElement>;
}
