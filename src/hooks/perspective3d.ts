import { clamp } from '../core/utils';

export type Perspective3dValues = {
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
  scale: number;
  translateZ: number;
};

/** Коэффициент 60 Hz, пересчитанный на фактическое время кадра. */
export function perspectiveFrameEase(value: number, frames: number): number {
  return 1 - Math.pow(1 - clamp(value, 0.001, 1), frames);
}

/** Два фильтра должны остановиться: пересечение цели само по себе ещё не означает покой. */
export function isPerspective3dSettled(current: Perspective3dValues, target: Perspective3dValues, smoothed: Perspective3dValues): boolean {
  return (Object.keys(target) as (keyof Perspective3dValues)[]).every((key) => {
    const tolerance = key === 'scale' ? 0.00005 : 0.001;
    return Math.abs(target[key] - current[key]) < tolerance && Math.abs(target[key] - smoothed[key]) < tolerance;
  });
}
