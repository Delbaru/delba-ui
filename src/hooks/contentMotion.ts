// Появление, уход и смена содержимого примитива раскладки (Flex, Box). Чистая часть: словарь
// классов (keyframes — в core/_content-motion.scss) и шаги свопа. Хук — useContentMotion.

import type { MotionTime } from '../core/base/timing';

export type ContentEnter = 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInScale';
export type ContentExit = 'fadeOut' | 'fadeOutUp' | 'fadeOutDown' | 'fadeOutScale';
export type ContentAnimation = ContentEnter | ContentExit;
export type ContentKey = string | number;

export interface ContentChangeAnimate {
  when: 'change';
  effect: 'fade' | 'up' | 'down' | 'scale';
  key: ContentKey;
  duration?: MotionTime;
}

export type FlexContentAnimate = ContentChangeAnimate;

const classOf: Record<ContentAnimation, string> = {
  fadeIn: 'ui-anim-fadeIn',
  fadeInUp: 'ui-anim-fadeInUp',
  fadeInDown: 'ui-anim-fadeInDown',
  fadeInScale: 'ui-anim-fadeInScale',
  fadeOut: 'ui-anim-fadeOut',
  fadeOutUp: 'ui-anim-fadeOutUp',
  fadeOutDown: 'ui-anim-fadeOutDown',
  fadeOutScale: 'ui-anim-fadeOutScale',
};

// Уход — зеркало входа: въехал сверху → уходит вверх.
const exitOf: Partial<Record<ContentAnimation, ContentExit>> = {
  fadeIn: 'fadeOut',
  fadeInDown: 'fadeOutUp',
  fadeInUp: 'fadeOutDown',
  fadeInScale: 'fadeOutScale',
};

export function resolveContentAnimate(
  input: FlexContentAnimate | undefined,
): { animation?: ContentEnter; key?: ContentKey; duration?: MotionTime } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const animations: Record<ContentChangeAnimate['effect'], ContentEnter> = {
    fade: 'fadeIn', up: 'fadeInUp', down: 'fadeInDown', scale: 'fadeInScale',
  };
  return { animation: animations[input.effect], key: input.key, duration: input.duration };
}

export function contentAnimationClass(animation: ContentAnimation | undefined, exiting: boolean): string | undefined {
  if (!animation) return undefined;
  return classOf[exiting ? exitOf[animation] ?? animation : animation];
}

export type SwapPhase = 'idle' | 'exit' | 'enter';

export interface SwapState {
  shown: ContentKey | undefined;
  phase: SwapPhase;
}

/**
 * Шаг свопа в духе AnimatePresence mode='wait'. `sync` — ключ мог смениться, `end` — ход узла
 * закончился (событием или страховочным таймером). Идущий ход не перебивается: смены во время
 * ухода склеиваются в последний ключ, смена во время входа догоняется после него.
 */
export function stepSwap(state: SwapState, latest: ContentKey | undefined, signal: 'sync' | 'end', reduced: boolean): SwapState {
  if (signal === 'end') {
    if (state.phase === 'exit') return { shown: latest, phase: reduced ? 'idle' : 'enter' };
    if (state.phase === 'enter') return { shown: state.shown, phase: 'idle' };
    return state;
  }

  if (state.phase !== 'idle' || latest === state.shown) return state;
  return reduced ? { shown: latest, phase: 'idle' } : { shown: state.shown, phase: 'exit' };
}
