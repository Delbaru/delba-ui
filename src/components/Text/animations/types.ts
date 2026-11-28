import type { ComponentType, ReactNode } from 'react';
import type { MotionChannels } from '#core/Motion';

import type { CounterOptions } from './counter/types';
import type { TextSlideOptions } from './textSlide/types';
import type { TextClipOptions } from './textClip/types';
import type { TextRevealOptions } from './textReveal/types';
import type { TextTimelineAnimate } from './timeline';

/**
 * Центральная карта анимаций Text: ключ → тип его опций. Добавление новой фишки = одна строка здесь
 * + папка плагина в ./<key>/ + одна строка в registry.ts. Сам Text.tsx при этом не меняется.
 */
export interface AnimationOptionsMap {
  counter: CounterOptions;
  textSlide: TextSlideOptions;
  textClip: TextClipOptions;
  textReveal: TextRevealOptions;
}

export type AnimationKey = keyof AnimationOptionsMap;
export type AnimationOptions = AnimationOptionsMap[AnimationKey];

type CounterEffect = { effect: 'counter' } & Omit<CounterOptions, 'trigger'>;
type TextAppearance = TextTimelineAnimate | (CounterEffect & { when: 'inView' | 'load' });
type TextHover = { effect: 'textSlide'; when?: never } & Pick<TextSlideOptions, 'duration' | 'hoverColor'>;
type TextChange = { when?: never } & (
  | CounterEffect
  | ({ effect: 'textReveal' } & TextRevealOptions)
  | ({ effect: 'textSlide' | 'textClip'; by?: never } & TextClipOptions)
  | ({ effect: 'textSlide'; steps?: never; currentStep?: never; clipHeight?: never } & Pick<TextSlideOptions, 'by' | 'duration'>)
);
type TextMotion = MotionChannels<{
  appearance: TextAppearance;
  hover: TextHover;
  change: TextChange;
}>;

/** Effects that render their own content share one slot inside the text host. */
export type TextAnimate = Pick<TextMotion, 'idle'> & (
  | { appearance?: TextMotion['appearance']; hover?: MotionChannels['hover']; change?: never }
  | { appearance?: MotionChannels['appearance']; hover: TextHover; change?: never }
  | { appearance?: MotionChannels['appearance']; hover?: MotionChannels['hover']; change: TextChange }
);

/** Контекст рендера, который Text передаёт активному плагину. */
export interface TextAnimationContext<O> {
  content: ReactNode;
  options?: O;
}

/**
 * Контракт плагина анимации. Вся логика (хуки), вёрстка и SCSS живут ВНУТРИ `Inner` — изолированно от
 * Text. `Inner` рендерится внутри host-элемента Text, поэтому наследует типографику (font/color/variant).
 */
export interface TextAnimation<K extends AnimationKey> {
  key: K;
  /** Активна ли анимация при данных опциях/контенте. Иначе Text рендерит контент как есть (без плагина). */
  isActive?(options: AnimationOptionsMap[K] | undefined, content: ReactNode): boolean;
  Inner: ComponentType<TextAnimationContext<AnimationOptionsMap[K]>>;
}

/** Тип-стёртое представление плагина для диспетчера в Text (опции — общий union, без дженерика по ключу). */
export interface AnyTextAnimation {
  key: AnimationKey;
  isActive?(options: AnimationOptions | undefined, content: ReactNode): boolean;
  Inner: ComponentType<TextAnimationContext<AnimationOptions>>;
}

/**
 * Объявление плагина: на входе проверяется строгий по ключу контракт (Inner ↔ опции этого ключа),
 * на выходе — тип-стёртое AnyTextAnimation для реестра. Небезопасное приведение заперто здесь.
 */
export function defineAnimation<K extends AnimationKey>(
  animation: TextAnimation<K>,
): AnyTextAnimation {
  return animation as unknown as AnyTextAnimation;
}
