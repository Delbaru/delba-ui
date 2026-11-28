import type { MotionTime } from '../../../core/base/timing';

export interface IconSwapOptions {
  /** Длительность одной фазы (exit или enter), сек. */
  duration?: MotionTime;
  /** Стартовый масштаб въезжающей иконки (и финишный у уходящей). 0..1. */
  scale?: number;
  /** Доворот (град): уходящая вращается на +rotate, въезжающая доворачивает из него в 0. 0 = без вращения. */
  rotate?: number;
}
/** Стили смены иконки: 'swap' — fade+scale; 'spin' — то же + доворот, быстрее (рецепт бейджа сайта). */
export type IconSwapKey = 'swap' | 'spin';

/** Объектная настройка смены глифа; первый показ не анимируется. */
export interface IconChangeAnimate extends IconSwapOptions {
  /** Последовательное исчезновение и появление; spin добавляет доворот. */
  effect: IconSwapKey;
}

/** Select change options without accepting appearance or hover effects. */
export function resolveIconChange(value: unknown): IconChangeAnimate | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value) || 'when' in value) return undefined;
  const candidate = value as Partial<IconChangeAnimate>;
  if (candidate.effect !== 'swap' && candidate.effect !== 'spin') return undefined;
  return {
    effect: candidate.effect,
    ...(candidate.duration !== undefined ? { duration: candidate.duration } : null),
    ...(candidate.scale !== undefined ? { scale: candidate.scale } : null),
    ...(candidate.rotate !== undefined ? { rotate: candidate.rotate } : null),
  };
}
