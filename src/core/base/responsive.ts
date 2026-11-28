import { BREAKPOINT } from './breakpoints';

// Респонсив-значение.
// Порядок массива ВАЖЕН: [desktop, mobile, tablet]
// (мы сознательно используем этот порядок во всём layout-ядре).

// Доп. правило: `null` внутри массива означает "не трогать этот брейкпоинт"
// (то есть не генерировать класс/стиль и оставить значение от базового стиля/variant).
/** Authored responsive values use exactly three entries. */
export type ResponsiveValue<T> = readonly [T | null, T | null, T | null];
/** Internal computed values may broadcast a scalar; authored props use ResponsiveValue. */
export type ResponsiveInput<T> = T | ResponsiveValue<T>;

/** Internal scalar broadcasting never fills missing entries of an authored tuple. */
export const resolveResponsiveInput = <T,>(value: ResponsiveInput<T>): [T | null, T | null, T | null] => {
  if (!Array.isArray(value)) return [value as T, value as T, value as T];
  if (value.length !== 3 || value.some(entry => entry === undefined))
    throw new Error('Responsive values require [desktop, mobile, tablet]; use null to skip');
  return [value[0] as T | null, value[1] as T | null, value[2] as T | null];
};

/** Authored responsive values have exactly three entries and never inherit desktop. */
export const resolveResponsive = <T,>(value: ResponsiveValue<T>): [T | null, T | null, T | null] => {
  if (!Array.isArray(value)) throw new Error('Responsive values require a three-entry tuple');
  return resolveResponsiveInput(value);
};

export function resolveResponsiveWithDefaults<T>(
  value: ResponsiveValue<T> | undefined,
  defaults: ResponsiveValue<T>,
): [T | null, T | null, T | null] {
  const base = resolveResponsive(defaults);
  if (value === undefined) return base;
  const resolved = resolveResponsive(value);
  return [resolved[0] ?? base[0], resolved[1] ?? base[1], resolved[2] ?? base[2]];
}

/** Индекс брейкпоинта по ширине окна: 0 — desktop (≥1024), 1 — mobile (≤767), 2 — tablet. */
export const getBreakpointIndex = (viewportWidth: number): 0 | 1 | 2 => {
  if (viewportWidth <= BREAKPOINT.mobileMax) return 1;
  if (viewportWidth <= BREAKPOINT.tabletMax) return 2;
  return 0;
};

/** Значение на одном брейкпоинте (0 — desktop, 1 — mobile, 2 — tablet) с запасным вариантом. */
export const resolveResponsiveAtBreakpoint = <T,>(
  value: ResponsiveInput<T> | undefined,
  fallback: T,
  breakpointIndex: 0 | 1 | 2
): T => {
  if (value === undefined) return fallback;

  return resolveResponsiveInput(value)[breakpointIndex] ?? fallback;
};

