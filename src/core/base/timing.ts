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
