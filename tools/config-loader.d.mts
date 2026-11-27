import type { FrontendConfig } from './config';

export interface ConfigLoadOptions {
    /** Directory used for discovery within the owning checkout. */
    cwd?: string;
    /** Explicit delba.config.ts path relative to cwd; null disables discovery. */
    config?: string | null;
}
export interface LoadedProjectConfig<T = FrontendConfig> {
    file: string;
    project: Record<string, unknown>;
    value: T;
    root: string;
    files: Set<string>;
    importModule(entry: string): Promise<Record<string, unknown>>;
    close(): Promise<void>;
}
export function resolveConfigFile(options?: ConfigLoadOptions): string | null;
export function loadProjectConfig<T = FrontendConfig>(
    options?: ConfigLoadOptions,
): Promise<LoadedProjectConfig<T> | null>;
