import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UiImages } from './config';

const OUTPUT = fileURLToPath(new URL('../src/core/image-config.ts', import.meta.url));

/** Reject ambiguous prefixes instead of silently broadening the project's public API policy. */
export function validateImages(images?: UiImages): void {
    if (images === undefined) return;
    if (images === null || typeof images !== 'object' || Array.isArray(images)) {
        throw new Error('images must be an object');
    }
    if (Object.keys(images).some((key) => key !== 'optimizeApi')) {
        throw new Error('images only supports optimizeApi');
    }
    if (images.optimizeApi === undefined) return;
    if (!Array.isArray(images.optimizeApi) || images.optimizeApi.some((prefix) =>
        typeof prefix !== 'string' || !prefix.startsWith('/api/') || !prefix.endsWith('/') ||
        /[?#\\%]/.test(prefix) || prefix.includes('//') ||
        prefix.split('/').some((segment) => segment === '.' || segment === '..')
    )) {
        throw new Error('images.optimizeApi must contain local /api/ directory prefixes with a trailing slash, without query, hash or traversal');
    }
}

export function imagesTs(images?: UiImages): string {
    validateImages(images);
    return `// AUTO-GENERATED: tools/images.ts. Do not edit.\nexport const IMAGE_CONFIG = ${JSON.stringify({ optimizeApi: [...new Set(images?.optimizeApi ?? [])] })} as const;\n`;
}

/** Generate the same image policy for server rendering and client art direction. */
export function generateImages(images?: UiImages, output = OUTPUT): boolean {
    const content = imagesTs(images);
    if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') === content) return false;
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, content, 'utf8');
    return true;
}
