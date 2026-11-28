import type { ComponentType, ReactNode } from 'react';

import { resolveCounterContent } from './counter/parseContent';
import { animationRegistry } from './registry';
import type {
  AnimationKey,
  AnimationOptions,
  AnimationOptionsMap,
  TextAnimate,
  TextAnimationContext,
} from './types';

export interface ResolvedAnimation {
  active: boolean;
  Inner?: ComponentType<TextAnimationContext<AnimationOptions>>;
  options?: AnimationOptions;
}

type RendererOptions = {
  [Key in AnimationKey]: { key: Key; options: AnimationOptionsMap[Key] };
}[AnimationKey];

/** Translate the Text-owned channels to options for the existing renderer registry. */
function parse(input: TextAnimate | undefined): RendererOptions | undefined {
  const appearance = input?.appearance;
  const hover = input?.hover;
  const change = input?.change;

  if (appearance?.effect === 'counter') {
    const { when, to, start, suffix, grouped, duration } = appearance;
    return {
      key: 'counter',
      options: { to, start, suffix, grouped, duration, trigger: when === 'load' ? 'onLoad' : 'onView' },
    };
  }
  if (hover && hover.effect === 'textSlide') {
    return { key: 'textSlide', options: { duration: hover.duration, hoverColor: hover.hoverColor } };
  }
  if (change?.effect === 'counter') {
    const { to, start, suffix, grouped, duration } = change;
    return { key: 'counter', options: { to, start, suffix, grouped, duration, trigger: 'onChange' } };
  }
  if (change?.effect === 'textReveal') {
    const { effect, ...options } = change;
    return { key: effect, options };
  }
  if (change?.steps && typeof change.currentStep === 'number') {
    const { effect, steps, currentStep, duration, clipHeight } = change;
    return { key: effect, options: { steps, currentStep, duration, clipHeight } };
  }
  if (change?.effect === 'textSlide') {
    const { by, duration } = change;
    return { key: 'textSlide', options: { mode: 'swap', duration, ...(by ? { by } : {}) } };
  }

  return undefined;
}

/** Effects with their own values still supply the selected value on a native text host. */
export function resolveTextOnlyAnimation(input: TextAnimate | undefined, content: string): string {
  const animation = parse(input);
  if (animation?.key === 'counter') {
    const counter = resolveCounterContent(content, animation.options);
    return counter.hasValue ? counter.text(counter.to) : content;
  }
  if (animation?.key === 'textSlide' || animation?.key === 'textClip') {
    const { steps, currentStep } = animation.options;
    if (steps && currentStep !== undefined) return steps[currentStep] ?? content;
  }
  return content;
}

/**
 * Резолвит проп анимации в активный плагин из реестра: парсит ключ+опции, проверяет isActive плагина.
 * Pure (без хуков) — Text вызывает один раз и либо рендерит `Inner`, либо контент как есть.
 */
export function resolveAnimation(
  input: TextAnimate | undefined,
  content: ReactNode,
): ResolvedAnimation {
  const animation = parse(input);
  if (!animation) return { active: false };
  const { options } = animation;
  const plugin = animationRegistry[animation.key];

  const active = plugin.isActive ? plugin.isActive(options, content) : true;
  return active ? { active, Inner: plugin.Inner, options } : { active: false };
}
