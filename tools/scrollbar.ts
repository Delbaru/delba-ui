import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrollbarProps, type ScrollbarOptions } from '../src/components/ScrollArea/scrollbar';
import { SCROLLBAR_DEFAULTS } from '../src/core/base/scrollbar';

const OUTPUT = fileURLToPath(new URL('../src/core/scrollbar-config.ts', import.meta.url));

/** Reject misspelled keys and invalid durations before generation changes any files. */
export function validateScrollbar(value?: ScrollbarOptions): void {
    if (value === undefined) return;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('scrollbar must be an object');
    for (const key of Object.keys(value)) {
        if (!(key in SCROLLBAR_DEFAULTS)) throw new Error(`scrollbar.${key} is not allowed`);
    }
    for (const key of ['width', 'inset', 'hideDelay', 'showDuration', 'fadeDuration'] as const) {
        const number = value[key];
        if (number !== undefined && (typeof number !== 'number' || !Number.isFinite(number) || number < 0)) {
            throw new Error(`scrollbar.${key} must be a non-negative finite number`);
        }
    }
    for (const key of ['color', 'trackColor'] as const) {
        if (value[key] !== undefined && (typeof value[key] !== 'string' || !value[key]?.trim())) throw new Error(`scrollbar.${key} must be a color`);
    }
    if (value.autoHide !== undefined && typeof value.autoHide !== 'boolean') throw new Error('scrollbar.autoHide must be a boolean');
    if (value.gutter !== undefined && value.gutter !== 'auto' && value.gutter !== 'stable') throw new Error('scrollbar.gutter must be auto or stable');
}

export function scrollbarTs(options?: ScrollbarOptions): string {
    validateScrollbar(options);
    return `// AUTO-GENERATED: tools/scrollbar.ts. Do not edit.\nexport const SCROLLBAR_CONFIG = ${JSON.stringify({ ...SCROLLBAR_DEFAULTS, ...options })} as const;\n`;
}

export function scrollbarCss(options?: ScrollbarOptions): string {
    validateScrollbar(options);
    const variables = scrollbarProps({ ...SCROLLBAR_DEFAULTS, ...options }).style;
    return `// AUTO-GENERATED: tools/scrollbar.ts. Do not edit.\n:root {\n${Object.entries(variables).filter(([key]) => key.startsWith('--')).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}\n`;
}

/** Same defaults in the server helper and every native scrolling component. */
export function generateScrollbar(options?: ScrollbarOptions, output = OUTPUT): boolean {
    let changed = false;
    const outputs = [[output, scrollbarTs(options)], [path.join(path.dirname(output), '_scrollbar-policy.scss'), scrollbarCss(options)]];
    for (const [file, content] of outputs) {
        if (file === undefined || content === undefined) continue;
        if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) continue;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content, 'utf8');
        changed = true;
    }
    return changed;
}
