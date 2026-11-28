import type { CSSProperties } from 'react';
import { normalizeComponentState, type ComponentStateValue } from '../component-state';
import { TYPOGRAPHY_FIELDS, textToken } from '../base/typography';
import { resolveUtility, UTILITIES } from '../utilities/registry';
import type { UtilityEntry } from '../utilities/keys';
import {
    PRESET_BANDS,
    PRESET_STATES,
    PRESET_STYLE_ONLY,
    PRESET_NATIVE_VISUAL,
} from './Preset.config';
import type { PresetOptions } from './Preset.types';
import styles from './Preset.module.scss';

type Props = Record<string, unknown>;
type Band = (typeof PRESET_BANDS)[number];
type Declarations = Map<string, string>;

const styleOnly = new Set<string>(PRESET_STYLE_ONLY);
const nativeStates = new Set<string>(PRESET_STATES);
const nativeVisual = new Set<string>(PRESET_NATIVE_VISUAL);
const ordinaryProperties: Readonly<Record<string, string>> = {
    opacity: 'opacity',
    cursor: 'cursor',
    overflow: 'overflow',
    overflowX: 'overflow-x',
    overflowY: 'overflow-y',
    zIndex: 'z-index',
    boxShadow: 'box-shadow',
};
const ordinaryProperty = (name: string): string | undefined =>
    Object.prototype.hasOwnProperty.call(ordinaryProperties, name)
        ? ordinaryProperties[name]
        : undefined;

const isObject = (value: unknown): value is Props =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
const visualUtility = (name: string) =>
    resolveUtility(name === 'alignItems' ? 'align' : name === 'justifyContent' ? 'justify' : name);
const definedProps = (value: object): Props =>
    Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

function visualProps(value: Props): Props {
    return Object.fromEntries(
        Object.entries(value).filter(
            ([name]) => visualUtility(name) || ordinaryProperty(name) || nativeVisual.has(name),
        ),
    );
}

function bands(value: unknown): readonly unknown[] {
    if (!Array.isArray(value)) return [value, value, value];
    if (value.length !== 3 || value.some((entry) => entry === undefined)) {
        throw new Error(
            'Preset responsive props require [desktop, mobile, tablet]; use null to skip',
        );
    }
    return value;
}

function declarations(name: string, entry: unknown, band: Band): Declarations {
    const result: Declarations = new Map();
    if (entry === undefined || entry === null) return result;
    if (name === 'text' || name === 'variant' || name === 'font') {
        if (entry === 'inherit') {
            result.set('font', 'inherit');
            result.set('text-transform', 'inherit');
            result.set('letter-spacing', 'inherit');
        } else if (typeof entry === 'string') {
            const fields = TYPOGRAPHY_FIELDS as Readonly<
                Record<string, Readonly<Record<'desktop' | 'mobile' | 'tablet', readonly string[]>>>
            >;
            const fieldBand = { d: 'desktop', m: 'mobile', t: 'tablet' } as const;
            for (const property of fields[entry]?.[fieldBand[band]] ?? []) {
                result.set(property, `var(--type-${textToken(entry)}-${property})`);
            }
        }
        return result;
    }
    const utility = visualUtility(name);
    if (utility) {
        let value = typeof entry === 'boolean' ? String(entry) : entry;
        if ((name === 'dir' || name === 'wrap') && typeof value === 'string')
            value = value.replaceAll('-', '_');
        if (typeof value !== 'number' && typeof value !== 'string' && !Array.isArray(value))
            return result;
        // Formatting stays with the utility registry, including shorthand, RPX and enum values.
        const declaration = utility.declare(value as UtilityEntry);
        if (!declaration) return result;
        const separator = declaration.indexOf(':');
        if (separator < 0) return result;
        const property = declaration.slice(0, separator).trim();
        const formatted = declaration.slice(separator + 1).trim();
        result.set(property, formatted.replace(/\s*!important$/, ''));
        return result;
    }
    const property = ordinaryProperty(name);
    if (property && (typeof entry === 'string' || typeof entry === 'number')) {
        if (typeof entry !== 'number' || Number.isFinite(entry))
            result.set(property, String(entry));
    }
    return result;
}

/** Registry order preserves shorthand/longhand and typography precedence regardless of object order. */
function visualDeclarations(props: Props, band: Band, index: number): Declarations {
    const result: Declarations = new Map();
    const ordered = new Set([
        'variant',
        'font',
        ...UTILITIES.map((utility) => utility.name),
        ...Object.keys(props),
    ]);
    for (const name of ordered) {
        const value = props[name];
        if (value === undefined || name === 'states' || name === 'preset') continue;
        if (
            name !== 'variant' &&
            name !== 'font' &&
            !visualUtility(name) &&
            !ordinaryProperty(name)
        )
            continue;
        const entry = bands(value)[index];
        for (const [property, formatted] of declarations(name, entry, band))
            result.set(property, formatted);
    }
    return result;
}

function stateFlags(props: Props): Set<string> {
    const normalized = normalizeComponentState(props.state as ComponentStateValue);
    const flags = new Set(normalized?.split(' ') ?? []);
    const enabled = (value: unknown) => value === true || value === 'true';
    if (enabled(props.disabled) || enabled(props['aria-disabled'])) flags.add('disabled');
    if (enabled(props.checked) || enabled(props['aria-checked'])) flags.add('checked');
    if (enabled(props.open) || enabled(props['aria-expanded'])) flags.add('open');
    if (enabled(props.selected) || enabled(props['aria-selected'])) flags.add('selected');
    if (enabled(props.active)) flags.add('active');
    if (
        enabled(props['aria-invalid']) ||
        props['aria-invalid'] === 'grammar' ||
        props['aria-invalid'] === 'spelling'
    )
        flags.add('error');
    if (enabled(props['aria-pressed'])) flags.add('pressed');
    return flags;
}

function mergeStates(preset: Props, instance: Props): Record<string, Props> {
    const defaults = isObject(preset.states) ? preset.states : {};
    const overrides = isObject(instance.states) ? instance.states : {};
    const result: Record<string, Props> = Object.create(null) as Record<string, Props>;
    for (const name of new Set([...Object.keys(defaults), ...Object.keys(overrides)])) {
        result[name] = {
            ...(isObject(defaults[name]) ? defaults[name] : {}),
            ...(isObject(overrides[name]) ? definedProps(overrides[name]) : {}),
        };
    }
    return result;
}

/** Pure and SSR-safe: props remain available to native models before layout/field extraction. */
export function resolvePresetProps<P extends object>(
    input: P,
    options: PresetOptions = {},
): P & { className: string; style: CSSProperties } {
    const instance = definedProps(input);
    const authored = isObject(instance.preset) ? instance.preset : {};
    const preset = visualProps(authored);
    const states = mergeStates(authored, instance);
    const flags = stateFlags(instance);
    const custom: Props = {};
    // Custom names have no CSS pseudo-class. Their visual props resolve directly from state tokens.
    for (const name of flags) {
        if (!nativeStates.has(name)) Object.assign(custom, visualProps(states[name] ?? {}));
    }
    const merged: Props = { ...preset, ...custom, ...instance };
    if (flags.size) merged.state = normalizeComponentState([...flags]);
    delete merged.preset;
    delete merged.states;

    const classNames = [
        styles.Preset,
        options.target === 'field' ? styles.Field : undefined,
        instance.className,
    ];
    const variables: Record<string, string> = {};
    const targetKey = options.target === 'field' ? 'field_' : '';
    const targetVariable = options.target === 'field' ? 'field-' : '';
    function assign(state: string, band: Band, values: Declarations) {
        for (const [property, value] of values) {
            const key = `${targetKey}${band}_${state}_${property.replaceAll('-', '_')}`;
            const className = styles[key];
            if (!className) continue;
            classNames.push(className);
            variables[`--preset-${targetVariable}${band}-${state}-${property}`] = value;
        }
    }

    PRESET_BANDS.forEach((band, index) => {
        assign('base', band, visualDeclarations(merged, band, index));
        assign('explicit', band, visualDeclarations(instance, band, index));
        for (const name of PRESET_STATES) {
            const values = visualDeclarations(states[name] ?? {}, band, index);
            const explicitState = visualDeclarations(
                isObject(instance.states) && isObject(instance.states[name])
                    ? instance.states[name]
                    : {},
                band,
                index,
            );
            assign(name, band, values);
            assign(`explicit_${name}`, band, explicitState);
        }
    });
    merged.className = classNames.filter(Boolean).join(' ');
    // Internal variables refresh when a native composition resolves its own layout again.
    merged.style = {
        ...(isObject(preset.style) ? preset.style : {}),
        ...(instance.style as CSSProperties | undefined),
        ...variables,
    };
    for (const name of styleOnly) delete merged[name];
    return merged as P & { className: string; style: CSSProperties };
}
