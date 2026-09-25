import type { ReactNode } from 'react';

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
  duration?: number;
  /** Сторона для `parallax` и `veil`: `1` — новая приходит справа (дальше по списку), `-1` — слева. По умолчанию `1`. */
  direction?: 1 | -1;
  /** Содержимое вуали для `veil`: заливка, знак, узор — что задаст проект. Без него `veil` сменяет как `fade`. */
  veil?: ReactNode;
}

/** Значение пропа `animate` у Img: ключ, [ключ] или [ключ, опции] — та же форма, что у Icon и Text. */
export type ImgAnimate = ImgSwapKey | [ImgSwapKey] | [ImgSwapKey, ImgSwapOptions];
