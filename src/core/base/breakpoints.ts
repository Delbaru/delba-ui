import { FRONTEND_THEME } from '../theme.generated';
import { responsiveMedia } from './responsive-definition';

const responsive = FRONTEND_THEME.responsive;
export const BREAKPOINT = {
    mobileMax: responsive.tablet.minWidth - 1,
    tabletMin: responsive.tablet.minWidth,
    tabletMax: responsive.desktop.minWidth - 1,
    desktopMin: responsive.desktop.minWidth,
} as const;
export const MEDIA_QUERY = responsiveMedia(responsive);
