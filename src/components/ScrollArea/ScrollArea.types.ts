import type { FlexProps } from '../Flex';
import type { ScrollbarOptions } from './scrollbar';

export interface ScrollAreaProps extends Omit<FlexProps, 'scrollFade'> {
    /** Ось нативной прокрутки. По умолчанию y. */
    axis?: 'x' | 'y';
    /** Затухание только краёв, за которыми есть содержимое. */
    fade?: boolean;
    /** Оформление нативной полосы. Padding содержимого задаётся обычными пропсами коробки. */
    scrollbar?: ScrollbarOptions;
}
