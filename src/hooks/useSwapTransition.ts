'use client';

import { useCallback, useEffect, useReducer, useRef, type AnimationEvent, type ReactNode } from 'react';

import { MOTION_END_BUFFER_MS, prefersReducedMotion, readMotionMs } from '../core';
import { stepSwap, type ContentKey, type SwapState } from './contentMotion';

type SwapAction = { signal: 'sync' | 'end'; latest: ContentKey | undefined; reduced: boolean };

const reduce = (state: SwapState, { signal, latest, reduced }: SwapAction) => stepSwap(state, latest, signal, reduced);

/**
 * Своп контента в стиле AnimatePresence mode='wait': при смене `key` старый контент проигрывает
 * exit и только потом подменяется новым (enter). Шаги — `stepSwap`. Конец хода — `animationend`
 * самого узла или страховка `readMotionMs + MOTION_END_BUFFER_MS` у ОБЕИХ фаз: без страховки входа
 * узел без анимации навсегда оставался во «входе» и следующие смены ключа не применялись.
 * reduced-motion свопает мгновенно.
 */
export function useSwapTransition(key: ContentKey | undefined, children: ReactNode) {
  const [state, dispatch] = useReducer(reduce, { shown: key, phase: 'idle' });
  const lastShown = useRef<ReactNode>(children);
  const latestKey = useRef(key);
  const nodeRef = useRef<HTMLElement | null>(null);

  latestKey.current = key;
  const live = state.shown === key && state.phase !== 'exit';
  // Снимок для ухода: пока контент синхронен, запоминаем последний показанный.
  if (live) lastShown.current = children;

  useEffect(() => {
    dispatch({ signal: 'sync', latest: key, reduced: prefersReducedMotion() });
  }, [key, state]);

  useEffect(() => {
    if (state.phase === 'idle') return undefined;
    const ms = nodeRef.current ? readMotionMs(nodeRef.current, 'animation') : 0;
    const timer = window.setTimeout(() => dispatch({ signal: 'end', latest: latestKey.current, reduced: prefersReducedMotion() }), ms + MOTION_END_BUFFER_MS);

    return () => window.clearTimeout(timer);
  }, [state]);

  const phase = state.phase;
  const onAnimationEnd = useCallback((event: AnimationEvent<HTMLElement>) => {
    // Ход вложенного узла всплывает сюда же — свой отличаем по цели.
    if (event.target !== event.currentTarget || phase === 'idle') return;
    dispatch({ signal: 'end', latest: latestKey.current, reduced: prefersReducedMotion() });
  }, [phase]);

  return {
    displayChildren: live ? children : lastShown.current,
    exiting: phase === 'exit',
    onAnimationEnd,
    ref: nodeRef,
  };
}
