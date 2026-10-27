import { IMAGE_CONFIG } from '../../core/image-config';

/** Explicit Next prop wins; otherwise only declared public local API directories are optimized. */
export function imageUnoptimized(
    source: unknown,
    explicit?: boolean,
    publicApiPrefixes: readonly string[] = IMAGE_CONFIG.optimizeApi,
): boolean | undefined {
    if (explicit !== undefined) return explicit;
    if (typeof source !== 'string' || !source.startsWith('/api/')) return undefined;
    const pathname = new URL(source, 'https://ui.invalid').pathname;
    return !publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}
