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
export interface IconChangeAnimate extends Omit<IconSwapOptions, 'duration'> {
  /** Запускает эффект при смене имени или компонента иконки. */
  when: 'change';
  /** Последовательное исчезновение и появление; spin добавляет доворот. */
  effect: IconSwapKey;
  /** Длительность каждой из двух фаз: секунды либо имя ui.config.motion.timing. */
  duration?: MotionTime;
}

/** Object intent for source changes; appearance is handled by shared motion. */
export type IconAnimate = IconChangeAnimate;

/** Engine options after selecting the change trigger. */
export type NormalizedIconChangeAnimate = Omit<IconChangeAnimate, 'when'>;

/** Select change options without accepting appearance or hover effects. */
export function normalizeIconAnimate(value: unknown): NormalizedIconChangeAnimate | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Partial<IconChangeAnimate>;
  if (candidate.when !== 'change' || (candidate.effect !== 'swap' && candidate.effect !== 'spin')) return undefined;
  return {
    effect: candidate.effect,
    ...(candidate.duration !== undefined ? { duration: candidate.duration } : null),
    ...(candidate.scale !== undefined ? { scale: candidate.scale } : null),
    ...(candidate.rotate !== undefined ? { rotate: candidate.rotate } : null),
  };
}
