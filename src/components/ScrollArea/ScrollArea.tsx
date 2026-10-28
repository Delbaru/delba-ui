'use client';

import { cx, type WithRef } from '../../core';
import { Flex, type FlexProps } from '../Flex';
import { scrollbarProps, type ScrollbarOptions } from './scrollbar';
import { useScrollbarActivity } from './ScrollbarActivity';

export interface ScrollAreaProps extends Omit<FlexProps, 'scrollFade'> {
    /** Ось нативной прокрутки. По умолчанию y. */
    axis?: 'x' | 'y';
    /** Затухание только тех краёв, за которыми есть содержимое; использует общий scrollFade. */
    fade?: boolean;
    /** Оформление нативной полосы. Padding содержимого задаётся обычными пропсами коробки. */
    scrollbar?: ScrollbarOptions;
}

/** Сам узел прокрутки: ref и DOM-события относятся к viewport. Заголовок и footer размещаются снаружи. */
export function ScrollArea({ axis = 'y', fade = false, scrollbar, className, style, ...props }: WithRef<ScrollAreaProps, HTMLDivElement>) {
    useScrollbarActivity();
    const decoration = scrollbarProps(scrollbar);

    return (
        <Flex
            {...props}
            scrollFade={fade ? axis : false}
            data-scroll-axis={axis}
            className={cx('ui-scroll-area', decoration.className, className)}
            style={{ ...decoration.style, ...style }}
        />
    );
}
