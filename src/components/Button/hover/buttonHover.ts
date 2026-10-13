import type { CSSProperties } from 'react';

import { motionTimeCss, type MotionTime } from '../../../core/base/timing';
import type { ButtonIdleAnimate } from '../idle/buttonIdle';

/** Заливка кнопки снизу вверх; цвет подписи и рамки остаётся у skin. */
export interface ButtonHoverAnimate {
  /** Наведение, клавиатурный фокус или соответствующее связанное состояние. */
  when: 'hover';
  /** Заливка поднимается снизу; корень кнопки остаётся на месте. */
  effect: 'rise';
  /** CSS-цвет или градиент заливки. По умолчанию — `--white-100`. */
  fill?: string;
  /** Имя motion.timing или секунды. По умолчанию — `normal`. */
  duration?: MotionTime;
}

export function buttonHoverProps(animate: unknown): { 'data-button-hover'?: 'rise'; style?: CSSProperties } {
  if (!animate || typeof animate !== 'object') return {};
  const input = animate as ButtonHoverAnimate | ButtonIdleAnimate;
  const config = input.when === 'idle' && input.effect === 'glow' ? input.hover : input.when === 'hover' ? input : undefined;
  if (!config || config.effect !== 'rise') return {};
  return {
    'data-button-hover': config.effect,
    style: {
      ...(config.fill !== undefined ? { '--button-hover-fill': config.fill } : null),
      ...(config.duration !== undefined ? { '--button-hover-duration': motionTimeCss(config.duration) } : null),
    } as CSSProperties,
  };
}
