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
export interface ImgChangeAnimate {
  /** Выбирает смену источника, отдельно от анимации появления Img. */
  when: 'change';
  /** Эффект смены источника. */
  effect: ImgSwapKey;
  /** Длительность в секундах или имя времени темы. У `veil` ход вдвое длиннее. */
  duration?: MotionTime;
  /** Сторона для `parallax` и `veil`: `1` — справа, `-1` — слева. */
  direction?: 1 | -1;
  /** Содержимое эффекта `veil`, заданное проектом; без него эффект сменяется как fade. */
  veil?: ReactNode;
}

/** Engine options after selecting the change trigger. */
export interface NormalizedImgChangeAnimate extends Omit<ImgChangeAnimate, 'when'> {}

/** Object intent for source changes; appearance is handled by shared motion. */
export type ImgAnimate = ImgChangeAnimate;

const IMG_SWAP_KEYS: readonly ImgSwapKey[] = ['fade', 'zoom', 'reveal', 'parallax', 'veil'];

/** Select source-change options without accepting appearance effects. */
export function normalizeImgAnimate(value: unknown): NormalizedImgChangeAnimate | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Partial<ImgChangeAnimate>;
  if (candidate.when !== 'change' || typeof candidate.effect !== 'string' || !IMG_SWAP_KEYS.includes(candidate.effect as ImgSwapKey)) return undefined;
  return {
    effect: candidate.effect as ImgSwapKey,
    ...(candidate.duration !== undefined ? { duration: candidate.duration } : null),
    ...(candidate.direction !== undefined ? { direction: candidate.direction } : null),
    ...(candidate.veil !== undefined ? { veil: candidate.veil } : null),
  };
}
