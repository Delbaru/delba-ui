import type { ReactNode } from 'react';
import type { MotionTime } from '../../../core/base/timing';

/**
 * Как новая картинка сменяет прежнюю при смене `src`:
 * - `fade` — кроссфейд;
 * - `zoom` — проявление с лёгким масштабом;
 * - `reveal` — клип снизу вверх поверх прежней;
 * - `parallax` — новая въезжает сбоку, снимок внутри отстаёт (глубина), прежняя уходит в тень;
 * - `veil` — вуаль (`veil` в опциях) заходит на кадр, прячет смену и уходит дальше.
 */
export type ImgSwapKey = 'fade' | 'zoom' | 'reveal' | 'parallax' | 'veil';

export interface ImgSwapOptions {
  /** Длительность смены, сек. По умолчанию — токен `--t-d-slow`; у `veil` ход вдвое длиннее (заход и уход). */
  duration?: MotionTime;
  /** Сторона для `parallax` и `veil`: `1` — новая приходит справа (дальше по списку), `-1` — слева. По умолчанию `1`. */
  direction?: 1 | -1;
  /** Содержимое вуали для `veil`: заливка, знак, узор — что задаст проект. Без него `veil` сменяет как `fade`. */
  veil?: ReactNode;
}

/** Объектная форма анимации смены источника. `duration` — секунды или имя времени темы. */
export interface ImgChangeAnimate extends ImgSwapOptions {
  /** Эффект смены источника. */
  effect: ImgSwapKey;
}

const IMG_SWAP_KEYS: readonly ImgSwapKey[] = ['fade', 'zoom', 'reveal', 'parallax', 'veil'];

/** Select source-change options without accepting appearance effects. */
export function resolveImgChange(value: unknown): ImgChangeAnimate | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value) || 'when' in value) return undefined;
  const candidate = value as Partial<ImgChangeAnimate>;
  if (!candidate.effect || !IMG_SWAP_KEYS.includes(candidate.effect)) return undefined;
  return {
    effect: candidate.effect,
    ...(candidate.duration !== undefined ? { duration: candidate.duration } : null),
    ...(candidate.direction !== undefined ? { direction: candidate.direction } : null),
    ...(candidate.veil !== undefined ? { veil: candidate.veil } : null),
  };
}
