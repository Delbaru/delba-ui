// Типы плагина Next (`@delba/ui/next`) — для `next.config.ts` в strict: у next.mjs своих нет.
import type { NextConfig } from 'next';

/** Второй аргумент конфига-функции Next. */
export interface UiNextContext {
  readonly defaultConfig: NextConfig;
}

/** Конфиг Next функцией: `(phase, { defaultConfig }) => config`. */
export type UiNextConfigFunction = (phase: string, context: UiNextContext) => NextConfig | Promise<NextConfig>;

/** Папка SCSS-входов кита для `sassOptions.loadPaths`: `@use '@delba/ui/mixins'` и прочие. */
export declare const UI_SASS: string;

/** Подключает кит к Next: исходники кита в сборку, SCSS-входы `@delba/ui/*` и генераты. */
export declare function withUi(nextConfig?: NextConfig | UiNextConfigFunction): (phase: string, context: UiNextContext) => Promise<NextConfig>;
