import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMotionTimingName, motionTimingVariable } from '../src/core/base/timing';
import {
    isMotionDistanceName,
    motionDistanceVariable,
    normalizeMotionDistance,
} from '../src/core/base/distance';
import type { UiMotion } from './config';
import { normalizeObserverMargin } from '../src/core/base/observer-margin';
import {
    MOTION_DEFAULTS,
    SCROLL_DEFAULTS,
    MOTION_TIMING_DEFAULTS,
    isDefaultTime,
    motionDefaultVariable,
    resolveMotionDefaults,
} from '../src/core/base/motion-defaults';
import {
    DEFAULT_EASING_ROLES,
    easingPresetName,
    resolveEasingPreset,
    type SerializedEasing,
    type MotionEasingRole,
} from '../src/core/base/easing';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(KIT, 'src', 'core', '_motion.scss');
const OUTPUT_TS = path.join(KIT, 'src', 'core', 'motion-config.ts');

function isRecord(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function assertOnlyKeys(
    value: Record<string, unknown>,
    allowed: readonly string[],
    prefix: string,
): void {
    const extras = Object.keys(value).filter((key) => !allowed.includes(key));
    if (extras.length > 0) throw new Error(`${prefix}.${extras[0]} is not allowed`);
}

/** Validate the exact public motion shape before any build/check/test command can mutate files. */
export function validateMotion(value: unknown): asserts value is UiMotion | undefined {
    if (value === undefined) return;
    if (!isRecord(value)) throw new Error('motion must be an object');
    assertOnlyKeys(
        value,
        ['timing', 'distance', 'visibility', 'defaults', 'easing', 'inView', 'scroll'],
        'motion',
    );
    if (value.inView !== undefined) {
        if (!isRecord(value.inView)) throw new Error('motion.inView must be an object');
        assertOnlyKeys(value.inView, ['rootMargin', 'threshold'], 'motion.inView');
        if (normalizeObserverMargin(value.inView.rootMargin) === null)
            throw new Error('motion.inView.rootMargin must name four sides in px/%');
        if (
            typeof value.inView.threshold !== 'number' ||
            !Number.isFinite(value.inView.threshold) ||
            value.inView.threshold < 0 ||
            value.inView.threshold > 1
        )
            throw new Error('motion.inView.threshold must be between 0 and 1');
    }
    if (value.scroll !== undefined) {
        if (!isRecord(value.scroll)) throw new Error('motion.scroll must be an object');
        assertOnlyKeys(
            value.scroll,
            [
                'duration',
                'minDuration',
                'maxDuration',
                'durationPerScreen',
                'lerp',
                'offset',
                'easing',
            ],
            'motion.scroll',
        );
        for (const key of ['duration', 'minDuration', 'maxDuration', 'durationPerScreen']) {
            const seconds = value.scroll[key];
            if (
                seconds !== undefined &&
                (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0)
            )
                throw new Error(`motion.scroll.${key} must be non-negative seconds`);
        }
        const minimum = value.scroll.minDuration ?? SCROLL_DEFAULTS.minDuration;
        const maximum = value.scroll.maxDuration ?? SCROLL_DEFAULTS.maxDuration;
        if (Number(minimum) > Number(maximum))
            throw new Error('motion.scroll.minDuration must not exceed maxDuration');
        if (
            value.scroll.lerp !== undefined &&
            (typeof value.scroll.lerp !== 'number' ||
                !Number.isFinite(value.scroll.lerp) ||
                value.scroll.lerp < 0 ||
                value.scroll.lerp > 1)
        )
            throw new Error('motion.scroll.lerp must be between 0 and 1');
        if (
            value.scroll.offset !== undefined &&
            typeof value.scroll.offset !== 'string' &&
            (typeof value.scroll.offset !== 'number' || !Number.isFinite(value.scroll.offset))
        )
            throw new Error('motion.scroll.offset must be a CSS length or number');
        if (value.scroll.easing !== undefined && easingPresetName(value.scroll.easing) === null)
            throw new Error('motion.scroll.easing must be a motionEasing preset');
    }
    if ('visibility' in value) {
        if (!isRecord(value.visibility)) throw new Error('motion.visibility must be an object');
        assertOnlyKeys(value.visibility, ['rootMargin'], 'motion.visibility');
        if (normalizeObserverMargin(value.visibility.rootMargin) === null)
            throw new Error(
                'motion.visibility.rootMargin must name top/right/bottom/left in px/% (or a legacy margin string)',
            );
    }
    if (value.defaults !== undefined) {
        if (!isRecord(value.defaults)) throw new Error('motion.defaults must be an object');
        assertOnlyKeys(value.defaults, Object.keys(MOTION_DEFAULTS), 'motion.defaults');
        for (const [group, values] of Object.entries(value.defaults)) {
            if (!isRecord(values)) throw new Error(`motion.defaults.${group} must be an object`);
            const defaults = MOTION_DEFAULTS[group as keyof typeof MOTION_DEFAULTS];
            assertOnlyKeys(values, Object.keys(defaults), `motion.defaults.${group}`);
            for (const [key, amount] of Object.entries(values)) {
                if (isDefaultTime(key) && isMotionTimingName(amount)) continue;
                if (
                    typeof amount !== 'number' ||
                    !Number.isFinite(amount) ||
                    (amount < 0 && key !== 'rotate' && key !== 'translateZ')
                ) {
                    throw new Error(
                        `motion.defaults.${group}.${key} must be finite${isDefaultTime(key) ? ' seconds or a timing name' : ''}`,
                    );
                }
                if (
                    (key === 'threshold' ||
                        key === 'ease' ||
                        key === 'restEase' ||
                        key === 'lerp') &&
                    (amount < 0 || amount > 1)
                )
                    throw new Error(`motion.defaults.${group}.${key} must be between 0 and 1`);
            }
        }
    }
    if (value.easing !== undefined) {
        if (!isRecord(value.easing)) throw new Error('motion.easing must be an object');
        assertOnlyKeys(value.easing, Object.keys(DEFAULT_EASING_ROLES), 'motion.easing');
        for (const [role, preset] of Object.entries(value.easing)) {
            if (easingPresetName(preset) === null)
                throw new Error(`motion.easing.${role} must be a motionEasing preset`);
        }
    }

    if (!('timing' in value)) throw new Error('motion.timing is required');
    const timing = value.timing;
    if (!isRecord(timing)) throw new Error('motion.timing must be an object');
    const entries = Object.entries(timing);
    if (entries.length === 0) throw new Error('motion.timing must contain at least one duration');

    for (const [name, duration] of entries) {
        if (!isMotionTimingName(name))
            throw new Error(`motion.timing.${name} must be a camelCase name`);
        if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
            throw new Error(
                `motion.timing.${name} must be a finite non-negative number of seconds`,
            );
        }
    }

    if ('distance' in value) {
        const distance = value.distance;
        if (!isRecord(distance)) throw new Error('motion.distance must be an object');
        if (Object.keys(distance).length === 0)
            throw new Error('motion.distance must contain at least one distance');
        for (const [name, amount] of Object.entries(distance)) {
            if (!isMotionDistanceName(name))
                throw new Error(`motion.distance.${name} must be a camelCase name`);
            if (
                normalizeMotionDistance(amount) === null ||
                (typeof amount === 'number' && amount < 0) ||
                (typeof amount === 'string' && !amount.endsWith('%'))
            ) {
                throw new Error(
                    `motion.distance.${name} must be a finite non-negative number of rpx or a non-negative percentage`,
                );
            }
        }
    }
}

/** Render the kit defaults and project overrides from the same source as runtime defaults. */
export function motionScss(motion?: UiMotion): string {
    validateMotion(motion);
    const declarations = Object.entries({ ...MOTION_TIMING_DEFAULTS, ...motion?.timing }).map(
        ([name, seconds]) => `  ${motionTimingVariable(name)}: ${seconds}s;`,
    );
    declarations.push(
        `  --t-m-visibility-root-margin: ${normalizeObserverMargin(motion?.visibility?.rootMargin ?? { top: '100px', right: '100px', bottom: '100px', left: '100px' })};`,
    );
    for (const [name, value] of Object.entries(motion?.distance ?? {})) {
        declarations.push(
            `  ${motionDistanceVariable(name)}: ${typeof value === 'number' ? `calc(var(--rpx) * ${value})` : value};`,
        );
    }
    for (const [group, values] of Object.entries(resolveMotionDefaults(motion?.defaults))) {
        for (const [key, value] of Object.entries(values)) {
            const css = isDefaultTime(key)
                ? typeof value === 'number'
                    ? `${value}s`
                    : `var(${motionTimingVariable(value)})`
                : key === 'distance'
                  ? `calc(var(--rpx) * ${value})`
                  : String(value);
            declarations.push(`  ${motionDefaultVariable(group, key)}: ${css};`);
        }
    }
    for (const [role, name] of Object.entries(resolveEasing(motion)))
        declarations.push(`  --t-t-f-${role}: ${resolveEasingPreset(name).css};`);
    return `// AUTO-GENERATED: tools/motion.ts (ui.config.ts). Do not edit.\n:root {\n${declarations.join('\n')}\n}\n`;
}

function resolveEasing(motion?: UiMotion): Record<MotionEasingRole, SerializedEasing> {
    return {
        ...DEFAULT_EASING_ROLES,
        ...Object.fromEntries(
            Object.entries(motion?.easing ?? {}).map(([role, value]) => [
                role,
                easingPresetName(value),
            ]),
        ),
    } as Record<MotionEasingRole, SerializedEasing>;
}

export function motionTs(motion?: UiMotion): string {
    validateMotion(motion);
    const runtime = {
        timing: { ...MOTION_TIMING_DEFAULTS, ...motion?.timing },
        defaults: resolveMotionDefaults(motion?.defaults),
        easing: resolveEasing(motion),
        inView: {
            rootMargin: normalizeObserverMargin(motion?.inView?.rootMargin ?? '0px'),
            threshold: motion?.inView?.threshold ?? 0,
        },
        scroll: {
            ...SCROLL_DEFAULTS,
            ...motion?.scroll,
            easing: easingPresetName(motion?.scroll?.easing) ?? SCROLL_DEFAULTS.easing,
        },
    };
    return `// AUTO-GENERATED: tools/motion.ts. Do not edit.\nimport type { RuntimeMotionConfig } from './base/motion-defaults';\nexport const MOTION_CONFIG: RuntimeMotionConfig = ${JSON.stringify(runtime)};\n`;
}

function writeIfChanged(file: string, content: string): boolean {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
    fs.writeFileSync(file, content, 'utf8');
    return true;
}

/** Write the kit-owned partial only when its generated contents changed. */
export function generateMotion(motion?: UiMotion): boolean {
    const css = motionScss(motion);
    const runtime = motionTs(motion);
    return [writeIfChanged(OUTPUT, css), writeIfChanged(OUTPUT_TS, runtime)].some(Boolean);
}

/** Write a generated partial to a target path (also used to test write-if-changed behavior). */
export function writeMotionScss(file: string, motion?: UiMotion): boolean {
    return writeIfChanged(file, motionScss(motion));
}
