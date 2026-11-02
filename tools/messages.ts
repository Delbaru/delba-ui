import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_UI_MESSAGES, resolveUiMessages } from '../src/core/base/message-defaults';
import type { UiMessageOverrides, UiMessages } from '../src/core/base/message-defaults';

const OUTPUT = fileURLToPath(new URL('../src/core/messages-config.ts', import.meta.url));

function isMessageSection(value: string): value is keyof UiMessages {
    return Object.prototype.hasOwnProperty.call(DEFAULT_UI_MESSAGES, value);
}

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function placeholders(value: string): string[] {
    return [...new Set([...value.matchAll(/\{([^{}]*)\}/g)].map((match) => match[1]))].sort()
        .filter((name): name is string => name !== undefined);
}

function validateText(value: unknown, fallback: string, location: string): void {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${location} must be a non-empty string`);
    const expected = placeholders(fallback);
    const actual = placeholders(value);
    if (expected.join(',') !== actual.join(',')) {
        const names = expected.map((name) => `{${name}}`).join(', ') || 'none';
        throw new Error(`${location} must preserve its message parameters: ${names}`);
    }
}

/** Rejects unknown keys, incomplete calendar lists and lost template parameters before generation. */
export function validateMessages(messages?: unknown): void {
    if (messages === undefined) return;
    if (!isObject(messages)) throw new Error('messages must be an object');

    for (const [section, values] of Object.entries(messages)) {
        if (!isMessageSection(section)) {
            throw new Error(`messages only supports configured UI sections; received ${section}`);
        }
        if (!isObject(values)) throw new Error(`messages.${section} must be an object`);
        const defaults: Readonly<Record<string, string | readonly string[]>> = DEFAULT_UI_MESSAGES[section];

        for (const [key, value] of Object.entries(values)) {
            const location = `messages.${section}.${key}`;
            if (!Object.prototype.hasOwnProperty.call(defaults, key)) throw new Error(`${location} is not supported`);
            const fallback = defaults[key];
            if (typeof fallback === 'string') {
                validateText(value, fallback, location);
            } else if (fallback) {
                if (!Array.isArray(value) || value.length !== fallback.length) {
                    throw new Error(`${location} must contain exactly ${fallback.length} labels`);
                }
                // Iterate the expected positions so sparse arrays cannot skip validation.
                fallback.forEach((label, index) => validateText(value[index], label, `${location}[${index}]`));
            }
        }
    }
}

/** A complete serializable dictionary is identical for server and client imports. */
export function messagesTs(messages?: UiMessageOverrides): string {
    validateMessages(messages);
    return `// AUTO-GENERATED: tools/messages.ts (ui.config.ts). Do not edit.\nexport const MESSAGES_CONFIG = ${JSON.stringify(resolveUiMessages(messages))} as const;\n`;
}

export function generateMessages(messages?: UiMessageOverrides, output = OUTPUT): boolean {
    const content = messagesTs(messages);
    if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') === content) return false;
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, content, 'utf8');
    return true;
}
