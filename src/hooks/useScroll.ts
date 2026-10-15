'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { subscribeWindowScroll } from '../components/SmoothScroll/scroll-events';
import { advanceScroll, createScrollState, initialScroll, type ScrollState, type ScrollWatchOptions } from '../core/base/scroll-direction';

const initialState = createScrollState(initialScroll);
const identity = (snapshot: ScrollState) => snapshot;

/** Нативная прокрутка: общий listener, один снимок за кадр, без проектных состояний. */
export function useScroll(options?: ScrollWatchOptions): ScrollState;
/** Короткий selector; обновляет компонент только при смене выбранного результата. */
export function useScroll<T>(select: (snapshot: ScrollState) => T): T;
/** Совместимая форма с настройками порога и направления. */
export function useScroll<T>(options: ScrollWatchOptions, select: (snapshot: ScrollState) => T): T;
export function useScroll<T>(optionsOrSelect: ScrollWatchOptions | ((snapshot: ScrollState) => T) = {}, selector?: (snapshot: ScrollState) => T) {
  const options = typeof optionsOrSelect === 'function' ? {} : optionsOrSelect;
  const select = typeof optionsOrSelect === 'function' ? optionsOrSelect : selector ?? identity;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [store] = useState(() => ({ value: initialState, listeners: new Set<() => void>() }));
  const subscribe = useCallback((listener: () => void) => {
    store.listeners.add(listener);
    return () => { store.listeners.delete(listener); };
  }, [store]);
  const selection = useMemo(() => {
    let source = store.value;
    let value = select(source);
    const serverValue = select(initialState);
    return {
      getSnapshot() {
        if (source !== store.value) {
          source = store.value;
          value = select(source);
        }
        return value;
      },
      getServerSnapshot: () => serverValue,
    };
  }, [select, store]);

  useEffect(() => {
    let state = initialScroll;
    let frame = 0;
    let position = window.scrollY;
    let max = 0;
    const sync = () => {
      frame = 0;
      const next = advanceScroll(state, Math.min(max, Math.max(0, position)), optionsRef.current);
      if (next.y === state.y && next.travel === state.travel && next.direction === state.direction && next.pastThreshold === state.pastThreshold) return;
      state = next;
      store.value = createScrollState(next);
      store.listeners.forEach((listener) => listener());
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const dimensions = () => {
      max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      position = window.scrollY;
      schedule();
    };
    const observer = new ResizeObserver(dimensions);
    observer.observe(document.body);
    const unsubscribe = subscribeWindowScroll((y) => { position = y; schedule(); });
    window.addEventListener('resize', dimensions);
    dimensions();
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
      window.removeEventListener('resize', dimensions);
    };
  }, [store]);

  return useSyncExternalStore(subscribe, selection.getSnapshot, selection.getServerSnapshot);
}
