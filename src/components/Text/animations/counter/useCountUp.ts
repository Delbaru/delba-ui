'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { clamp01, prefersReducedMotion } from '../../../../core';
import { readMotionTimeMs, type MotionTime } from '../../../../core/base/timing';
import { configuredMotionEasing, readMotionDefaultMs } from '../../../../core/base/motion-config';

export interface UseCountUpOptions {
  /** Duration in seconds or a motion.timing name. */
  duration?: MotionTime;
  start?: number;
}


// Ход числа по кадрам. Очистка гасит ТЕКУЩИЙ кадр: id первого кадра к середине хода уже устарел,
// и цепочка продолжалась бы после размонтирования.
function runCount(to: number, start: number, duration: number, onFrame: (value: number) => void): () => void {
  const startTime = performance.now();
  const diff = to - start;
  const easing = configuredMotionEasing('counter');
  let id = 0;

  const tick = (now: number) => {
    // Метка кадра rAF бывает раньше performance.now() из эффекта: без нижней границы (1-t)**4 > 1 и число уходит в минус.
    const progress = clamp01((now - startTime) / duration);
    onFrame(Math.round(start + diff * easing(progress)));
    if (progress < 1) id = requestAnimationFrame(tick);
  };

  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

export function useCountUp(
  to: number,
  options: UseCountUpOptions = {},
  enabled = true,
  resetOnDisable = false
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

    const milliseconds = duration === undefined ? readMotionDefaultMs('counter', 'duration') : readMotionTimeMs(duration);
    if (milliseconds <= 0) { setValue(to); return; }
    return runCount(to, start, milliseconds, setValue);
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
  { duration, start = 0 }: UseCountUpOptions,
  enabled: boolean,
  resetOnDisable: boolean,
  format: (value: number) => string
): void {
  const formatRef = useRef(format);

  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const write = (value: number) => {
      const text = formatRef.current(value);
      if (node.firstChild) {
        if (node.firstChild.nodeValue !== text) node.firstChild.nodeValue = text;
      } else if (node.textContent !== text) node.textContent = text;
    };

    if (!enabled) {
      if (resetOnDisable) write(start);
      return undefined;
    }

    if (to === start || prefersReducedMotion()) {
      write(to);
      return undefined;
    }

    const durationMs = duration === undefined ? readMotionDefaultMs('counter', 'duration', node) : readMotionTimeMs(duration, node);
    if (durationMs <= 0) {
      write(to);
      return undefined;
    }
    return runCount(to, start, durationMs, write);
  }, [ref, enabled, to, start, duration, resetOnDisable]);
}
