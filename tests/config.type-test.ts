import type { FrontendConfig } from '../tools/config';

export const authorConfig = {
    theme: {
        sources: ['src/shared/theme'],
        padding: { none: 0, pair: [8, 12], quad: [1, 2, 3, 4] },
    },
    typography: ['h1', 'p1'],
} as const satisfies FrontendConfig;

// @ts-expect-error Root is owned by the location of delba.config.ts.
export const legacyRoot = { root: 'app' } satisfies FrontendConfig;
// @ts-expect-error Runner settings are not author settings.
export const runnerConfig = { testConcurrency: 1 } satisfies FrontendConfig;
// @ts-expect-error Theme sources have an explicit named section.
export const legacyTheme = { theme: ['theme'] } satisfies FrontendConfig;
// @ts-expect-error Padding supports a scalar, pair or four-value tuple.
export const invalidPadding = { theme: { sources: ['theme'], padding: { bad: [1, 2, 3] } } } satisfies FrontendConfig;
