// Появление, уход и смена содержимого примитива раскладки (Flex, Box). Чистая часть: словарь
// классов (keyframes — в core/_content-motion.scss) и шаги свопа. Хук — useContentMotion.

export type ContentEnter = 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInScale';
export type ContentExit = 'fadeOut' | 'fadeOutUp' | 'fadeOutDown' | 'fadeOutScale';
export type ContentAnimation = ContentEnter | ContentExit;
export type ContentKey = string | number;

export interface ContentAnimateOptions {
  /** Идентификатор содержимого: при его смене старое уходит зеркальным ходом, затем входит новое. */
  key?: ContentKey;
}

/** Проп `animate`: ключ, `[ключ]` или `[ключ, опции]` — та же форма, что у Img, Icon и Text. */
export type ContentAnimate = ContentEnter | [ContentEnter] | [ContentEnter, ContentAnimateOptions];

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

export function resolveContentAnimate(input: ContentAnimate | undefined): { animation?: ContentEnter; key?: ContentKey } {
  if (input === undefined) return {};
  if (typeof input === 'string') return { animation: input };
  return { animation: input[0], key: input.length === 2 ? input[1].key : undefined };
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
