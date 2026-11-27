import type { FrontendConfig } from './config';
export interface FrontendActionContext {
    root: string;
    settings: FrontendConfig;
    env?: NodeJS.ProcessEnv;
    args?: readonly string[];
}
export interface ThemeAxesOptions<F extends string = string, L extends string = string, T extends string = string> {
    root: string;
    directory: string;
    source: string;
    rebuildCommand?: string;
    fills: Readonly<Record<F, string>>;
    lines: Readonly<Record<L, readonly [number, string] | readonly [number, string, string]>>;
    texts: Readonly<Record<T, string>>;
    iconColors: Readonly<Record<string, string>>;
    maps?: Readonly<Record<string, Readonly<Record<string, string>>>>;
    fillClass?: (name: F) => string;
    borderClass?: (name: L) => string;
    textClass?: (name: T) => string;
}
export declare function generateThemeAxes<F extends string, L extends string, T extends string>(options: ThemeAxesOptions<F, L, T>): Promise<number>;
export declare function vendorEmojiAssets(options: {
    root: string; emojis: readonly string[]; directory: string; manifest: string;
}): Promise<number>;
export declare function resolveFrontendConfiguration(settings: FrontendConfig, rawEnv?: NodeJS.ProcessEnv,
    context?: { operation: string; environment: string }): Promise<{
        settings: FrontendConfig; environment: Record<string, never>; public: Record<string, never>;
    }>;
export declare function prepareFrontend(context: FrontendActionContext): Promise<true>;
export declare function watchFrontend(context: FrontendActionContext): Promise<{ close(): void }>;
export declare function checkFrontend(context: FrontendActionContext): Promise<boolean>;
export declare function testFrontend(context: FrontendActionContext): Promise<boolean>;
export declare function formatFrontend(context: FrontendActionContext): Promise<true>;
export declare function runFrontendNext(context: FrontendActionContext, command: 'dev' | 'build' | 'start'): Promise<true>;
declare const declaration: {
    id: 'delbaFrontend'; command: 'frontend'; requires: readonly [];
    configuration: { resolve: typeof resolveFrontendConfiguration; public: readonly [] };
    actions: {
        build: typeof prepareFrontend; watch: typeof watchFrontend;
        check: typeof checkFrontend; test: typeof testFrontend;
        format: typeof formatFrontend;
        startup(context: FrontendActionContext): Promise<true>;
        dev(context: FrontendActionContext): Promise<true>;
        start(context: FrontendActionContext): Promise<true>;
    };
};
export default declaration;
