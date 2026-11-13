'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { prefersReducedMotion } from '../../../../core';
import { readMotionTimeMs, type MotionTime } from '../../../../core/base/timing';
import { readMotionDefaultMs } from '../../../../core/base/motion-config';
import { createCountMotion } from './countMotion';

export interface UseCountUpOptions {
  /** Duration in seconds or a motion.timing name. */
  duration?: MotionTime;
  start?: number;
}

export function useCountUp(
  to: number,
  options: UseCountUpOptions = {},
  enabled = true,
  resetOnDisable = false,
): number {
  const { duration, start = 0 } = options;
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (!enabled) {
      if (resetOnDisable) {
        const timer = setTimeout(() => setValue(start), 0);
        return () => clearTimeout(timer);
      }
      return undefined;
    }

    if (to === start) {
      const timer = setTimeout(() => setValue(to), 0);
      return () => clearTimeout(timer);
    }

    // Уважаем prefers-reduced-motion: без анимации сразу показываем итоговое значение.
    if (prefersReducedMotion()) {
      setValue(to);
      return undefined;
    }

    const milliseconds =
      duration === undefined
        ? readMotionDefaultMs('counter', 'duration')
        : readMotionTimeMs(duration);
    if (milliseconds <= 0) {
      setValue(to);
      return;
    }
    const motion = createCountMotion(start, setValue);
    motion.animate(to, milliseconds);
    return motion.cancel;
  }, [enabled, to, start, duration, resetOnDisable]);

  return value;
}

/**
 * Тот же ход, но число пишется прямо в текстовый узел: без рендера React на каждый кадр (четыре
 * счётчика × 2,5 с на первом экране — это сотни рендеров во время гидрации). Узел — единственный
 * текстовый ребёнок `ref`: React держит его же, и повторный рендер с тем же текстом его не трогает.
 */
export function useCountUpNode(
  ref: RefObject<HTMLElement | null>,
  to: number,
  { duration, start = 0, retarget = false, places = 0 }: UseCountUpOptions & { retarget?: boolean; places?: number },
  enabled: boolean,
  resetOnDisable: boolean,
  format: (value: number) => string,
): void {
  const formatRef = useRef(format);
  const motionRef = useRef<{ node: HTMLElement; motion: ReturnType<typeof createCountMotion> } | null>(null);

  useLayoutEffect(() => {
    formatRef.current = format;
    motionRef.current?.motion.refresh();
  });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const write = (value: number) => {
      const text = formatRef.current(value);
      if (node.firstChild) {
        if (node.firstChild.nodeValue !== text) node.firstChild.nodeValue = text;
      } else if (node.textContent !== text) node.textContent = text;
    };
    if (motionRef.current?.node !== node) {
      motionRef.current = { node, motion: createCountMotion(start, write) };
    }
    const motion = motionRef.current.motion;

    if (!enabled) {
      if (resetOnDisable) motion.set(start);
      return undefined;
    }

    if (prefersReducedMotion()) {
      motion.set(to);
      return undefined;
    }

    const durationMs =
      duration === undefined
        ? readMotionDefaultMs('counter', 'duration', node)
        : readMotionTimeMs(duration, node);
    if (durationMs <= 0) {
      motion.set(to);
      return undefined;
    }
    motion.animate(to, durationMs, places, retarget ? undefined : start);
    return motion.cancel;
  }, [ref, enabled, to, start, duration, resetOnDisable, retarget, places]);
}
