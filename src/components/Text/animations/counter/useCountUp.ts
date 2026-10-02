'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { clamp01, prefersReducedMotion } from '../../../../core';

export interface UseCountUpOptions {
  duration?: number;
  start?: number;
}

function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

// Ход числа по кадрам. Очистка гасит ТЕКУЩИЙ кадр: id первого кадра к середине хода уже устарел,
// и цепочка продолжалась бы после размонтирования.
function runCount(to: number, start: number, duration: number, onFrame: (value: number) => void): () => void {
  const startTime = performance.now();
  const diff = to - start;
  let id = 0;

  const tick = (now: number) => {
    // Метка кадра rAF бывает раньше performance.now() из эффекта: без нижней границы (1-t)**4 > 1 и число уходит в минус.
    const progress = clamp01((now - startTime) / duration);
    onFrame(Math.round(start + diff * easeOutQuart(progress)));
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
  const { duration = 2500, start = 0 } = options;
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (!enabled) {
      if (resetOnDisable) {
        setTimeout(() => setValue(start), 0);
      }
      return;
    }

    if (to === start) {
      setTimeout(() => setValue(to), 0);
      return;
    }

    // Уважаем prefers-reduced-motion: без анимации сразу показываем итоговое значение.
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }

    return runCount(to, start, duration, setValue);
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
  { duration = 2500, start = 0 }: UseCountUpOptions,
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
      if (node.firstChild) node.firstChild.nodeValue = text;
      else node.textContent = text;
    };

    if (!enabled) {
      if (resetOnDisable) write(start);
      return undefined;
    }

    if (to === start || prefersReducedMotion()) {
      write(to);
      return undefined;
    }

    return runCount(to, start, duration, write);
  }, [ref, enabled, to, start, duration, resetOnDisable]);
}
