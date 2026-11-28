import type { FrontendConfig } from './config';
export interface FrontendActionContext {
    root: string;
    settings: FrontendConfig;
    env?: NodeJS.ProcessEnv;
    args?: readonly string[];
}
export declare function vendorEmojiAssets(options: {
    root: string; emojis: readonly string[]; directory: string; manifest: string;
}): Promise<number>;
export declare function resolveFrontendConfiguration(settings: FrontendConfig, rawEnv?: NodeJS.ProcessEnv,
    context?: { operation: string; environment: string }): Promise<{
        settings: FrontendConfig; environment: Record<string, never>; public: Record<string, never>;
    }>;
export declare function prepareFrontendSources(context: FrontendActionContext): Promise<true>;
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
        prepare: typeof prepareFrontendSources;
        build: typeof prepareFrontend; watch: typeof watchFrontend;
        check: typeof checkFrontend; test: typeof testFrontend;
        format: typeof formatFrontend;
        dev(context: FrontendActionContext): Promise<true>;
        start(context: FrontendActionContext): Promise<true>;
    };
};
export default declaration;
