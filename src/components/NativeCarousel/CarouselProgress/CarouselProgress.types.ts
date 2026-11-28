import type { Ref } from 'react';
import type { FlexProps } from '../../Flex';
import type { NativeCarouselController } from '../controller';

export interface CarouselProgressProps extends Omit<FlexProps, 'children'> {
    /** The same controller passed to NativeCarousel. */
    controller: NativeCarouselController;
    /** Progress fill colour; defaults to inherited currentColor. */
    fill?: string;
    /** DOM ref of the outer progress bar. */
    ref?: Ref<HTMLElement>;
}
