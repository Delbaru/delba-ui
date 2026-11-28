import { FRONTEND_THEME } from '../theme.generated';
import { isMotionTimingName as validMotionTimingName, motionTimingVariable } from './motion-timing';
export { motionTimingVariable } from './motion-timing';
import { MOTION_CONFIG } from '../motion-config';
import { MOTION_TIMING_DEFAULTS, type RuntimeMotionConfig } from './motion-defaults';

/** Timing names come from the same generated author configuration as CSS and runtime. */
export type MotionTimingName = (typeof FRONTEND_THEME.motionTiming)[number];

/** Имя общей шкалы либо точное время в секундах. */
export type MotionTime = MotionTimingName | number;

/** Проверка формы имени из JS; принадлежность шкале проверяют типы проекта. */
export function isMotionTimingName(value: unknown): value is MotionTimingName {
    return validMotionTimingName(value);
}

/** Время в секундах либо имя шкалы → CSS, без чтения DOM (подходит для SSR). */
export function motionTimeCss(value: MotionTime): string {
    return typeof value === 'number'
        ? `${Number.isFinite(value) && value >= 0 ? value : 0}s`
        : isMotionTimingName(value)
          ? `var(${motionTimingVariable(value)})`
          : '0s';
}

/** Deterministic first-render value: identical during SSR and initial hydration. */
export function motionTimeFallbackMs(value: MotionTime, fallbackSeconds = 0): number {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value * 1000 : 0;
    const configured = isMotionTimingName(value)
        ? ((MOTION_CONFIG as Partial<RuntimeMotionConfig>).timing?.[value] ??
          (MOTION_TIMING_DEFAULTS as Record<string, number>)[value])
        : undefined;
    const seconds = configured ?? fallbackSeconds;
    const fallback = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 0;
    return fallback;
}

/** Время шкалы в миллисекундах на том же DOM-узле, где CSS наследует переменную темы. */
export function readMotionTimeMs(
    value: MotionTime,
    scope?: Element | Document,
    fallbackSeconds = 0,
): number {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value * 1000 : 0;
    const fallback = motionTimeFallbackMs(value, fallbackSeconds);
    if (!isMotionTimingName(value)) return fallback;
    const css = readMotionVariable(motionTimingVariable(value), scope);
    const match = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/.exec(css);
    if (!match) return fallback;
    const amount = Number(match[1]);
    return Number.isFinite(amount) ? amount * (match[2] === 's' ? 1000 : 1) : fallback;
}

/** Reads inherited motion CSS in its owning document; runtime config remains the SSR fallback. */
export function readMotionVariable(name: string, scope?: Element | Document): string {
    const target = scope
        ? 'documentElement' in scope ? scope.documentElement : scope
        : typeof document === 'undefined' ? undefined : document.documentElement;
    const view = target?.ownerDocument.defaultView;
    return target && view ? view.getComputedStyle(target).getPropertyValue(name).trim() : '';
}
