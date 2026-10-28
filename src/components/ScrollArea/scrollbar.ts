import type { CSSProperties } from 'react';
import { SCROLLBAR_CONFIG } from '../../core/scrollbar-config';

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
    /** Hide the decoration at rest, preserving native scroll geometry. Defaults to ui.config.scrollbar.autoHide (true). */
    autoHide?: boolean;
    /** Seconds to keep the decoration after the pointer leaves or scrolling/dragging stops. Default 0.3. */
    hideDelay?: number;
    /** Fade-in duration in seconds. Default 0.15. */
    showDuration?: number;
    /** Fade-out duration in seconds; reduced motion removes the transition. Default 0.2. */
    fadeDuration?: number;
}

/** Оформляет существующий viewport, включая html, без дополнительного узла. Работает на сервере. */
export function scrollbarProps(options: ScrollbarOptions = {}): { className: string; style: CSSProperties } {
    const settings = {
        width: options.width ?? SCROLLBAR_CONFIG.width,
        color: options.color ?? SCROLLBAR_CONFIG.color,
        trackColor: options.trackColor ?? SCROLLBAR_CONFIG.trackColor,
        inset: options.inset ?? SCROLLBAR_CONFIG.inset,
        gutter: options.gutter ?? SCROLLBAR_CONFIG.gutter,
        autoHide: options.autoHide ?? SCROLLBAR_CONFIG.autoHide,
        hideDelay: options.hideDelay ?? SCROLLBAR_CONFIG.hideDelay,
        showDuration: options.showDuration ?? SCROLLBAR_CONFIG.showDuration,
        fadeDuration: options.fadeDuration ?? SCROLLBAR_CONFIG.fadeDuration,
    };
    return {
        className: 'ui-scrollbar',
        style: {
            '--ui-scrollbar-width': `calc(${settings.width} * var(--rpx))`,
            '--ui-scrollbar-color': settings.color,
            '--ui-scrollbar-track': settings.trackColor,
            '--ui-scrollbar-inset': `calc(${settings.inset} * var(--rpx))`,
            '--ui-scrollbar-native-width': settings.width === 0 ? 'none' : settings.width <= 8 ? 'thin' : 'auto',
            '--ui-scrollbar-auto-hide': settings.autoHide ? 1 : 0,
            '--ui-scrollbar-rest-opacity': settings.autoHide ? 0 : 1,
            '--ui-scrollbar-hide-delay': `${settings.hideDelay}s`,
            '--ui-scrollbar-show-duration': `${settings.showDuration}s`,
            '--ui-scrollbar-fade-duration': `${settings.fadeDuration}s`,
            scrollbarGutter: settings.gutter,
        } as CSSProperties,
    };
}
