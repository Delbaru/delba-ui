/** Доля времени 0–1 → доля пути 0–1. */
export type Easing = (progress: number) => number;

const easeInOut: Easing = t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

/** Кривые скролла: публичный словарь с автодополнением, без React и стилей. */
export const scrollEasing = {
  /** Равномерная скорость. */
  linear: (t: number) => t,
  /** Плавный разгон и торможение. */
  ease: easeInOut,
  /** Постепенный разгон. */
  easeIn: (t: number) => t ** 3,
  /** Плавное торможение. */
  easeOut: (t: number) => 1 - (1 - t) ** 3,
  /** Симметричный разгон и торможение; та же кривая, что ease. */
  easeInOut,
  /** Быстрый старт и долгое мягкое торможение. */
  easeOutExpo: (t: number) => t >= 1 ? 1 : 1 - 2 ** (-10 * t),
} as const;
