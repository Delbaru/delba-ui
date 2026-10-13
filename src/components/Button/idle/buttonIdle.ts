import type { CSSProperties } from 'react';

import { motionTimeCss, type MotionTime } from '../../../core/base/timing';
import type { ButtonHoverAnimate } from '../hover/buttonHover';

/** Перелив оттенков свечения неподвижной кнопки с постоянным размером ореола. */
export interface ButtonIdleAnimate {
  /** Постоянная анимация в покое. */
  when: 'idle';
  /** Свечение вокруг кнопки; градиент задаёт её skin. */
  effect: 'glow';
  /** CSS-цвет свечения. По умолчанию — primary темы. */
  color?: string;
  /** Второй оттенок свечения в конце цикла. По умолчанию совпадает с color. */
  colorTo?: string;
  /** Множитель яркости свечения. По умолчанию 1. */
  strength?: number;
  /** Длительность цикла: секунды или имя motion.timing. */
  duration?: MotionTime;
  /** Заливка при наведении поверх продолжающейся idle-анимации. */
  hover?: Omit<ButtonHoverAnimate, 'when'>;
}

export function buttonIdleProps(animate: unknown): { 'data-button-idle'?: 'glow'; style?: CSSProperties } {
  if (!animate || typeof animate !== 'object') return {};
  const config = animate as ButtonIdleAnimate;
  if (config.when !== 'idle' || config.effect !== 'glow') return {};
  return {
    'data-button-idle': config.effect,
    style: {
      ...(config.color !== undefined ? { '--button-glow-color': config.color } : null),
      ...(config.colorTo !== undefined ? { '--button-glow-color-to': config.colorTo } : null),
      ...(config.strength !== undefined ? { '--button-glow-strength': config.strength } : null),
      ...(config.duration !== undefined ? { '--button-glow-duration': motionTimeCss(config.duration) } : null),
    } as CSSProperties,
  };
}
