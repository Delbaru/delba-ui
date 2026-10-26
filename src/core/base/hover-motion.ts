import type { CSSProperties } from 'react';

import { motionDistanceCss, normalizeMotionDistance, type MotionDistance } from './distance';
import { motionTimeCss, type MotionTime } from './timing';

export interface HoverTransformValues {
    /** Horizontal displacement in rpx, percent or a motion.distance token; negative values are supported. */
    x?: MotionDistance;
    /** Vertical displacement in rpx, percent or a motion.distance token; negative values are supported. */
    y?: MotionDistance;
    /** Absolute scale, with 1 as the neutral value. */
    scale?: number;
    /** Rotation in degrees. */
    rotate?: number;
}

export interface HoverTransformOptions extends HoverTransformValues {
    /** Transform of this node; appearance continues to own its individual translate/scale properties. */
    effect: 'transform';
    /** self by default; closest finds the nearest ancestor motionScope, link or button. */
    source?: 'self' | 'parent' | 'closest';
    /** Resting transform, for example scale 1 / 1.1 for a raster prepared with 10% reserve. */
    from?: HoverTransformValues;
    /** Shared motion.timing token or seconds; normal by default. */
    duration?: MotionTime;
    /** Token suffix from --t-t-f-*, for example ease-out or cubic-bezier. */
    easing?: string;
}

export interface HoverTransformAnimate extends HoverTransformOptions {
    /** Pointer hover and keyboard focus within the selected source share one CSS state. */
    when: 'hover';
}

export function isHoverTransformAnimate(value: unknown): value is HoverTransformAnimate {
    if (!value || typeof value !== 'object') return false;
    return 'when' in value && value.when === 'hover' && 'effect' in value && value.effect === 'transform';
}

export function resolveHoverTransform(value: unknown): HoverTransformOptions | undefined {
    if (isHoverTransformAnimate(value)) return value;
    if (!value || typeof value !== 'object' || !('hover' in value)) return undefined;
    const hover = value.hover;
    return hover && typeof hover === 'object' && 'effect' in hover && hover.effect === 'transform'
        ? hover as HoverTransformOptions : undefined;
}

function distance(value: MotionDistance | undefined): string {
    if (value === undefined) return '0px';
    const negative = typeof value === 'number' ? value < 0 : value.startsWith('-');
    const normalized = normalizeMotionDistance(typeof value === 'string' && negative ? value.slice(1) : value);
    if (normalized === null) return '0px';
    const css = motionDistanceCss(normalized);
    return negative ? `calc(-1 * ${css})` : css;
}

export function hoverTransformCss(value: HoverTransformValues = {}): string {
    const scale = typeof value.scale === 'number' && Number.isFinite(value.scale) && value.scale >= 0 ? value.scale : 1;
    const rotate = typeof value.rotate === 'number' && Number.isFinite(value.rotate) ? value.rotate : 0;
    return `translate(${distance(value.x)}, ${distance(value.y)}) rotate(${rotate}deg) scale(${scale})`;
}

/** Pure SSR recipe: no measurements, listeners or generated project selectors. */
export function hoverMotionStyle(options: HoverTransformOptions): CSSProperties {
    const easing = options.easing && /^[a-z][a-z0-9-]*$/.test(options.easing) ? options.easing : 'cubic-bezier';
    return {
        '--hover-motion-from': hoverTransformCss(options.from),
        '--hover-motion-to': hoverTransformCss(options),
        '--hover-motion-duration': options.duration === undefined ? 'var(--t-d-normal)' : motionTimeCss(options.duration),
        '--hover-motion-easing': `var(--t-t-f-${easing})`,
    } as CSSProperties;
}

export function hoverMotionSource(node: Element, source: HoverTransformOptions['source']): Element | null {
    if (source === 'parent') return node.parentElement;
    if (source === 'closest') return node.parentElement?.closest('[data-motion-scope], a[href], button') ?? null;
    return node;
}
