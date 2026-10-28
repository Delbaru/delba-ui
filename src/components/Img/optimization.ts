import { IMAGE_CONFIG } from '../../core/image-config';

/** Keep small native-auto candidates: Next's vw estimate must not treat a fallback as the actual layout. */
export function nativeImageSizes(fallback: string): string {
    // calc(length) preserves the CSS fallback while avoiding Next's literal-vw pruning.
    // Tokens inside custom-property names are left alone.
    return `auto, ${fallback.replace(/(?<![\w.-])(\d+(?:\.\d+)?)vw\b/g, 'calc($1vw)')}`;
}

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
