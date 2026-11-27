import type { CSSProperties } from 'react';
/** Native scrollbar defaults shared by generated config, SSR and the client. Times are seconds. */
export const SCROLLBAR_DEFAULTS = {
    width: 6,
    color: 'currentColor',
    trackColor: 'transparent',
    inset: 4,
    gutter: 'stable' as const,
    autoHide: true,
    hideDelay: 0.3,
    showDuration: 0.15,
    fadeDuration: 0.2,
};

/** Pure native scrollbar style shared by generated CSS and runtime. */
export function scrollbarStyle(settings: Omit<typeof SCROLLBAR_DEFAULTS, 'gutter'> & {
    gutter: 'auto' | 'stable';
}): CSSProperties {
    return {
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
    } as CSSProperties;
}
