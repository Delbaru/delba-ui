import type { MotionTime } from '../../../core/base/timing';

export interface IconSwapOptions {
  /** Длительность одной фазы (exit или enter), сек. */
  duration?: number;
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

/** Объектный API и совместимые прежние ключи/кортежи (их duration остаётся в секундах). */
export type IconAnimate = IconChangeAnimate | IconSwapKey | [IconSwapKey] | [IconSwapKey, IconSwapOptions];

/** Общая внутренняя форма для новых и прежних настроек смены. */
export type NormalizedIconChangeAnimate = Omit<IconChangeAnimate, 'when'>;

/** Приводит object и legacy API к одному эффекту без настроек общего появления/hover. */
export function normalizeIconAnimate(value: unknown): NormalizedIconChangeAnimate | undefined {
  if (typeof value === 'string') return value === 'swap' || value === 'spin' ? { effect: value } : undefined;
  if (Array.isArray(value)) {
    const [effect, options] = value;
    if (effect !== 'swap' && effect !== 'spin') return undefined;
    const opts = options && typeof options === 'object' ? options as IconSwapOptions : undefined;
    return { ...opts, effect };
  }
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<IconChangeAnimate>;
  if (candidate.when !== 'change' || (candidate.effect !== 'swap' && candidate.effect !== 'spin')) return undefined;
  return {
    effect: candidate.effect,
    ...(candidate.duration !== undefined ? { duration: candidate.duration } : null),
    ...(candidate.scale !== undefined ? { scale: candidate.scale } : null),
    ...(candidate.rotate !== undefined ? { rotate: candidate.rotate } : null),
  };
}
