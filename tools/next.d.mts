// Типы плагина Next (`@delba/frontend/next`) — для `next.config.ts` в strict: у next.mjs своих нет.
import type { NextConfig } from 'next';
import type { FrontendConfig } from './config';

/** Второй аргумент конфига-функции Next. */
export interface FrontendNextContext {
    readonly defaultConfig: NextConfig;
}

/** Конфиг Next функцией: `(phase, { defaultConfig }) => config`. */
export type FrontendNextConfigFunction = (
    phase: string,
    context: FrontendNextContext,
) => NextConfig | Promise<NextConfig>;

/** Папка SCSS-входов кита для `sassOptions.loadPaths`: `@use '@delba/frontend/mixins'` и прочие. */
export declare const FRONTEND_SASS: string;

/** Подключает кит к Next: исходники кита в сборку, SCSS-входы `@delba/frontend/*` и генераты. */
export declare function withFrontend(
    nextConfig: NextConfig | FrontendNextConfigFunction,
    options: { settings: FrontendConfig; root?: string },
): (phase: string, context: FrontendNextContext) => Promise<NextConfig>;
