export interface ConfigLoadOptions {
    /** Directory used for discovery and for direct UI configs without a root. */
    cwd?: string;
    /** Explicit path relative to cwd; null disables discovery for standalone tooling. */
    config?: string | null;
    /** Select a section of a project composition; direct configs are used as-is. */
    profile?: string;
}
export interface LoadedProjectConfig<T = Record<string, unknown>> {
    file: string;
    project: Record<string, unknown>;
    value: T;
    root: string;
    files: Set<string>;
    importModule(entry: string): Promise<Record<string, unknown>>;
    close(): Promise<void>;
}
export function resolveConfigFile(options?: ConfigLoadOptions): string | null;
export function loadProjectConfig<T = Record<string, unknown>>(
    options?: ConfigLoadOptions,
): Promise<LoadedProjectConfig<T> | null>;
