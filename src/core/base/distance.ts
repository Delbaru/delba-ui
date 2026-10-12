declare global {
  /** Имена из keyof typeof ui.config.motion.distance. */
  interface UiMotionDistance {}
}

/** Проект задаёт допустимые имена; без декларации подходят имена темы. */
export type MotionDistanceName = UiMotionDistance extends { names: infer Name extends string } ? Name : string;

/** Расстояние в rpx, доля собственного размера или имя шкалы проекта. */
export type MotionDistance = number | `${number}%` | MotionDistanceName;

export function isMotionDistanceName(value: unknown): value is MotionDistanceName {
  return typeof value === 'string' && /^[a-z][A-Za-z0-9]*$/.test(value);
}

export function motionDistanceVariable(name: string): string {
  return `--t-m-distance-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Никакой произвольной CSS-строки: только неотрицательный процент или безопасное имя. */
export function normalizeMotionDistance(value: unknown): MotionDistance | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.abs(value) : null;
  if (typeof value !== 'string') return null;
  if (/^[a-z][A-Za-z0-9]*$/.test(value)) return value as MotionDistanceName;
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)%$/.test(value)) return null;
  return Number.isFinite(Number(value.slice(0, -1))) ? value as `${number}%` : null;
}

/** Имена разрешаются CSS-переменной, поэтому сервер и клиент получают одно значение. */
export function motionDistanceCss(value: MotionDistance): string {
  if (typeof value === 'number') return `calc(var(--rpx) * ${value})`;
  if (value.endsWith('%')) return value;
  return `var(${motionDistanceVariable(value)}, calc(var(--rpx) * 32))`;
}
