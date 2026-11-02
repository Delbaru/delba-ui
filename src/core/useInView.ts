'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';
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
  ref?: RefObject<T | null>,
  options: UseInViewOptions = {},
): { isInView: boolean; ratio: number; setTarget: (node: T | null) => void } {
  const {
    threshold = motionInView.threshold,
    rootMargin = motionInView.rootMargin,
    root = null,
    initialInView = false,
  } = options;
  const margin = normalizeObserverMargin(rootMargin) ?? '0px';
  const [objectTarget, setObjectTarget] = useState<T | null>(null);
  const [callbackTarget, setCallbackTarget] = useState<T | null | undefined>(undefined);
  const initialState = { isInView: initialInView, ratio: initialInView ? 1 : 0 };
  const [observed, setObserved] = useState({ target: null as T | null, ...initialState });
  const setTarget = useCallback((node: T | null) => setCallbackTarget(node), []);

  // Object refs update during commit without triggering a render. Read them after commit so a
  // replaced node causes the observer to detach from the old node and attach to the new one.
  useLayoutEffect(() => {
    const nextTarget = ref?.current ?? null;
    setObjectTarget((currentTarget) => (currentTarget === nextTarget ? currentTarget : nextTarget));
  });

  const target = callbackTarget === undefined ? objectTarget : callbackTarget;

  useEffect(() => {
    if (!target) {
      setObserved({ target: null, ...initialState });
      return;
    }
    const view = target.ownerDocument.defaultView;
    const Observer = view?.IntersectionObserver;
    if (!Observer) {
      setObserved({ target, ...initialState });
      return;
    }

    const observer = new Observer(
      ([entry]) => {
        if (!entry) return;
        setObserved({
          target,
          isInView: entry.isIntersecting,
          ratio: entry.intersectionRatio,
        });
      },
      { threshold, rootMargin: margin, root },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [target, threshold, margin, root]);

  const state = observed.target === target ? observed : initialState;
  return { ...state, setTarget };
}
