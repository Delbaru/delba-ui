declare global {
  /** Имена из keyof typeof ui.config.motion.timing; тот же договор, что у UiTypography. */
  interface UiMotionTiming {}
}

/** Проект задаёт допустимые имена. Без декларации кит принимает строковые имена темы. */
export type MotionTimingName = UiMotionTiming extends { names: infer Name extends string } ? Name : string;

/** Имя общей шкалы либо точное время в секундах. */
export type MotionTime = MotionTimingName | number;

/** Проверка формы имени из JS; принадлежность шкале проверяют типы проекта. */
export function isMotionTimingName(value: unknown): value is MotionTimingName {
  return typeof value === 'string' && /^[a-z][A-Za-z0-9]*$/.test(value);
}

/** CSS-договор прежних длительностей: camelCase в API, kebab-case в CSS. */
export function motionTimingVariable(name: string): string {
  return `--t-d-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Время в секундах либо имя шкалы → CSS, без чтения DOM (подходит для SSR). */
export function motionTimeCss(value: MotionTime): string {
  return typeof value === 'number'
    ? `${Number.isFinite(value) && value >= 0 ? value : 0}s`
    : isMotionTimingName(value) ? `var(${motionTimingVariable(value)})` : '0s';
}

/** Время шкалы в миллисекундах на том же DOM-узле, где CSS наследует переменную темы. */
export function readMotionTimeMs(value: MotionTime, scope?: Element | Document, fallbackSeconds = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value * 1000 : 0;
  const fallback = Number.isFinite(fallbackSeconds) && fallbackSeconds >= 0 ? fallbackSeconds * 1000 : 0;
  if (!isMotionTimingName(value) || typeof getComputedStyle !== 'function') return fallback;

  const target: Element | undefined = scope
    ? 'documentElement' in scope ? scope.documentElement : scope
    : typeof document !== 'undefined' ? document.documentElement : undefined;
  if (!target) return fallback;

  const css = getComputedStyle(target).getPropertyValue(motionTimingVariable(value)).trim();
  const match = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/.exec(css);
  if (!match) return fallback;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount * (match[2] === 's' ? 1000 : 1) : fallback;
}
