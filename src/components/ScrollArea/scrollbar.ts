import type { CSSProperties } from 'react';

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

/** Оформляет существующий viewport, включая html, без дополнительного узла. Работает на сервере. */
export function scrollbarProps(options: ScrollbarOptions = {}): { className: string; style: CSSProperties } {
    return {
        className: 'ui-scrollbar',
        style: {
            '--ui-scrollbar-width': `calc(${options.width ?? 8} * var(--rpx))`,
            '--ui-scrollbar-color': options.color ?? 'currentColor',
            '--ui-scrollbar-track': options.trackColor ?? 'transparent',
            '--ui-scrollbar-inset': `calc(${options.inset ?? 4} * var(--rpx))`,
            '--ui-scrollbar-native-width': options.width === 0 ? 'none' : (options.width ?? 8) <= 8 ? 'thin' : 'auto',
            scrollbarGutter: options.gutter ?? 'stable',
        } as CSSProperties,
    };
}
