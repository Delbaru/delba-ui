'use client';

import type { CSSProperties } from 'react';
import { cx, type WithRef } from '../../core';
import { Flex, type FlexProps } from '../Flex';

export interface ScrollbarOptions {
    /** Толщина в дизайн-единицах; Firefox использует ближайший нативный thin/auto. */
    width?: number;
    /** Цвет бегунка; обычно CSS-переменная темы потребителя. */
    color?: string;
    /** Цвет дорожки. По умолчанию прозрачная. */
    trackColor?: string;
    /** Отступ дорожки от начала и конца в дизайн-единицах (WebKit). */
    inset?: number;
    /** Резервировать место под классическую полосу без скачка ширины. */
    gutter?: 'auto' | 'stable';
}

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
    const variables = {
        '--ui-scrollbar-width': `calc(${scrollbar?.width ?? 8} * var(--rpx))`,
        '--ui-scrollbar-color': scrollbar?.color ?? 'currentColor',
        '--ui-scrollbar-track': scrollbar?.trackColor ?? 'transparent',
        '--ui-scrollbar-inset': `calc(${scrollbar?.inset ?? 4} * var(--rpx))`,
        '--ui-scrollbar-native-width': scrollbar?.width === 0 ? 'none' : (scrollbar?.width ?? 8) <= 8 ? 'thin' : 'auto',
        scrollbarGutter: scrollbar?.gutter ?? 'stable',
    } as CSSProperties;

    return (
        <Flex
            {...props}
            scrollFade={fade ? axis : false}
            data-scroll-axis={axis}
            className={cx('ui-scroll-area', className)}
            style={{ ...variables, ...style }}
        />
    );
}
