'use client';

import type { AnimationEventHandler, ReactNode } from 'react';

import { composeEventHandlers } from '../core';
import { contentAnimationClass, type ContentAnimation, type ContentKey } from './contentMotion';
import { useSwapTransition } from './useSwapTransition';

interface ContentMotionInput {
  animation?: ContentAnimation;
  key?: ContentKey;
  children: ReactNode;
  /** Обработчик вызывающего: зовётся вместе со своим, своп его не заменяет. */
  onAnimationEnd?: AnimationEventHandler<HTMLElement>;
}

/**
 * Один механизм появления и свопа для примитивов раскладки: класс хода на самом узле (без обёрток
 * и ремоунта), содержимое для показа, ref для замера длительности и общий `onAnimationEnd`.
 * Без анимации ключ ни на что не влияет: содержимое меняется сразу, а не после страховки.
 */
export function useContentMotion({ animation, key, children, onAnimationEnd }: ContentMotionInput) {
  const swapKey = animation ? key : undefined;
  const swap = useSwapTransition(swapKey, children);
  const swapping = swapKey !== undefined;

  return {
    className: contentAnimationClass(animation, swapping && swap.exiting),
    children: swap.displayChildren,
    ref: swap.ref,
    onAnimationEnd: swapping ? composeEventHandlers(swap.onAnimationEnd, onAnimationEnd) : onAnimationEnd,
  };
}
