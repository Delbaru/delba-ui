import { borderClass, fillClass, textClass } from '../src/skin/index';

export interface SkinAxes {
    fills: Readonly<Record<string, string>>;
    lines: Readonly<Record<string, readonly [number, string] | readonly [number, string, string]>>;
    texts: Readonly<Record<string, string>>;
    maps?: Readonly<Record<string, Readonly<Record<string, string>>>>;
    fillClass?: (name: string) => string;
    borderClass?: (name: string) => string;
    textClass?: (name: string) => string;
}

/** One renderer for library skin dictionaries and consumer-owned theme axes. */
export function renderSkinAxes(axes: SkinAxes, { defaultMaps = false } = {}): { tokens: string; classes: string } {
    const map = (name: string, entries: ReadonlyArray<readonly [string, string]>) =>
        `$${name}: (\n${entries.map(([key, value]) => `  '${key}': ${value},\n`).join('')})${defaultMaps ? ' !default' : ''};\n`;
    const lines = Object.entries(axes.lines);
    return {
        tokens: [
            map('fills', Object.entries(axes.fills)),
            map('lines', lines.map(([name, value]) => [name, `(${value.join(', ')})`])),
            map('texts', Object.entries(axes.texts)),
            ...Object.entries(axes.maps ?? {}).map(([name, values]) => map(name, Object.entries(values))),
        ].join('\n'),
        classes: [
            ...Object.entries(axes.fills).map(([name, value]) => `.${(axes.fillClass ?? fillClass)(name)} { background: ${value}; }`),
            ...lines.map(([name, [width, color, style = 'solid']]) =>
                `.${(axes.borderClass ?? borderClass)(name)} { border: calc(${width} * var(--rpx)) ${style} ${color}; }`),
            ...Object.entries(axes.texts).map(([name, value]) => `.${(axes.textClass ?? textClass)(name)} { color: ${value}; }`),
        ].join('\n') + '\n',
    };
}
