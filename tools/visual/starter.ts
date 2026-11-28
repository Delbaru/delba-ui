import type { FrontendConfig, FrontendTypography } from '../config';
import { defaultMotion } from './default-motion';

const body = {
    fontFamily: ['primary', 'primary', 'primary'],
    fontSize: [16, 16, 16],
    fontWeight: [400, 400, 400],
    lineHeight: [1.5, 1.5, 1.5],
    letterSpacing: [0, 0, 0],
    textTransform: ['none', 'none', 'none'],
} as const satisfies FrontendTypography;

/** Complete standalone fixture. Consumers supply their own complete configuration. */
export const starterFrontend = {
    responsive: {
        mobile: { minWidth: 0, designWidth: 320, scale: 'fluid' },
        tablet: { minWidth: 768, designWidth: 768, scale: 'fluid' },
        desktop: { minWidth: 1024, designWidth: 1920, scaleLimit: 2560, scale: 'fluid' },
    },
    fonts: { primary: { family: 'Arial', fallback: 'sans-serif', faces: [] } },
    colors: {
        primary: { normal: '#24272c', hover: '#41474f', pressed: '#101214', foreground: '#ffffff' },
        secondary: { normal: '#f1f2f4', hover: '#e8eaed', pressed: '#dfe1e5', foreground: '#24272c' },
        surface: '#ffffff', text: '#24272c', line: '#dfe1e5',
        error: '#e5484d', warning: '#f5a524', success: '#30a46c', info: '#3b7ff2',
    },
    gradients: {},
    typography: {
        body,
        title: { ...body, fontSize: [20, 20, 20], fontWeight: [600, 600, 600] },
        caption: { ...body, fontSize: [14, 14, 14] },
        micro: { ...body, fontSize: [12, 12, 12] },
        p1: body,
        h1: { ...body, fontSize: [40, 32, 36], fontWeight: [600, 600, 600] },
        h4: { ...body, fontSize: [20, 20, 20], fontWeight: [600, 600, 600] },
    },
    geometry: {
        dimensions: {}, positions: {}, radii: { none: 0, sm: 4, md: 8 },
        padding: { none: 0, sm: [4, 8], md: [8, 16] },
        lines: { line: [1, 'var(--line)'] }, shadows: {},
    },
    motion: defaultMotion,
    variables: { 'z-modal': '1000', 'z-toast': '1100', 'z-top': '10000', 'z-under-floating': '9998' },
    scrollbar: {
        width: 6, color: 'currentColor', trackColor: 'transparent', inset: 4, gutter: 'stable',
        autoHide: true, hideDelay: 0.3, showDuration: 0.15, fadeDuration: 0.2,
    },
} as const satisfies FrontendConfig;
