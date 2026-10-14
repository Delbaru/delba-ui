'use client';

import { useEffect, useRef, useState } from 'react';

import { subscribeWindowScroll } from '../components/SmoothScroll/scroll-events';
import { advanceScroll, createScrollState, initialScroll, type ScrollState, type ScrollWatchOptions } from '../core/base/scroll-direction';

/** Нативная прокрутка: один общий listener, один снимок за кадр, без знания о компонентах сайта. */
export function useScroll(options?: ScrollWatchOptions): ScrollState;
/** Выбор примитивного состояния: компонент обновляется только когда результат select меняется. */
export function useScroll<T>(options: ScrollWatchOptions, select: (snapshot: ScrollState) => T): T;
export function useScroll(options: ScrollWatchOptions = {}, select: (snapshot: ScrollState) => unknown = (snapshot) => snapshot) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const selectRef = useRef(select);
  selectRef.current = select;
  const [snapshot, setSnapshot] = useState(() => select(createScrollState(initialScroll)));

  useEffect(() => {
    let state = initialScroll;
    let selected = selectRef.current(createScrollState(state));
    let frame = 0;
    let position = window.scrollY;
    let max = 0;
    const sync = () => {
      frame = 0;
      const next = advanceScroll(state, Math.min(max, Math.max(0, position)), optionsRef.current);
      if (next.y === state.y && next.travel === state.travel && next.direction === state.direction && next.pastThreshold === state.pastThreshold) return;
      const nextSelected = selectRef.current(createScrollState(next));
      if (!Object.is(nextSelected, selected)) {
        selected = nextSelected;
        setSnapshot(() => nextSelected);
      }
      state = next;
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
  }, []);

  return snapshot;
}
