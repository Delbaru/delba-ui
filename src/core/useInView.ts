'use client';

import { useEffect, useState, type RefObject } from 'react';
import { normalizeObserverMargin, type ObserverMargin } from './base/observer-margin';
import { motionInView } from './base/motion-config';

export interface UseInViewOptions {
  threshold?: number | number[];
  rootMargin?: ObserverMargin;
  root?: Element | null;
  /**
   * Что считать ДО первого отчёта наблюдателя. По умолчанию `false` — «ещё не видели»,
   * это верно для появления по скроллу (счётчик не должен разгоняться заранее).
   * Потребителю, который по НЕвидимости что-то ПОКАЗЫВАЕТ (плавашка вместо уехавшей шапки),
   * нужен `true`: иначе на первом кадре он мигнёт показанным и тут же спрячется.
   */
  initialInView?: boolean;
}

export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  options: UseInViewOptions = {}
): { isInView: boolean; ratio: number } {
  const { threshold = motionInView.threshold, rootMargin = motionInView.rootMargin, root = null, initialInView = false } = options;
  const margin = normalizeObserverMargin(rootMargin) ?? '0px';
  const [state, setState] = useState({ isInView: initialInView, ratio: initialInView ? 1 : 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setState({
          isInView: entry.isIntersecting,
          ratio: entry.intersectionRatio,
        });
      },
      { threshold, rootMargin: margin, root }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, margin, root]);

  return state;
}
