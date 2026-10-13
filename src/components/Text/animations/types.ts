import type { ComponentType, ReactNode } from 'react';
import type { MotionTime } from '../../../core/base/timing';

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

/** Значение пропа `animate`/`animation`: ключ, [ключ] или [ключ, опции-под-этот-ключ] (типизированно). */
export type AnimationInput =
  | AnimationKey
  | [AnimationKey]
  | { [K in AnimationKey]: [K, AnimationOptionsMap[K]] }[AnimationKey];

/** Общая объектная форма анимаций содержимого Text. Время здесь в секундах или именем темы. */
export type TextAnimate =
  | TextTimelineAnimate
  | {
      /** Запуск при входе в экран или сразу после монтирования. */
      when: 'inView' | 'load';
      /** Число из содержимого или явного to. */
      effect: 'counter';
      /** Секунды или имя шкалы motion.timing. */
      duration?: MotionTime;
      /** Начальное число; по умолчанию 0. */
      start?: number;
      /** Итоговое число; без него разбирается содержимое Text. */
      to?: number;
      /** Текст после числа; без него сохраняется суффикс содержимого. */
      suffix?: string;
      /** Разделять разряды по ru-RU. */
      grouped?: boolean;
    }
  | {
      /** Смена по изменению содержимого Text. */
      when: 'change';
      /** Посимвольный слайд только изменившихся символов. */
      effect: 'textSlide';
      /** Секунды или имя шкалы motion.timing. */
      duration?: MotionTime;
    };

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
export function defineAnimation<K extends AnimationKey>(animation: TextAnimation<K>): AnyTextAnimation {
  return animation as unknown as AnyTextAnimation;
}
