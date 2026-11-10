import type { ComponentType, ReactNode } from 'react';

import { animationRegistry } from './registry';
import type {
  AnimationKey,
  AnimationOptions,
  TextAnimate,
  TextAnimationContext,
} from './types';

export interface ResolvedAnimation {
  active: boolean;
  Inner?: ComponentType<TextAnimationContext<AnimationOptions>>;
  options?: AnimationOptions;
}

/** Adapt the object intent to the existing text-effect renderer registry. */
function parse(input: TextAnimate | undefined): {
  key?: AnimationKey;
  options?: AnimationOptions;
} {
  if (input == null) return {};

  if (typeof input === 'object' && !Array.isArray(input) && 'effect' in input) {
    if (input.effect === 'counter') {
      return {
        key: 'counter',
        options: {
          to: input.to,
          start: input.start,
          suffix: input.suffix,
          grouped: input.grouped,
          trigger: input.when === 'change' ? 'onChange' : input.when === 'load' ? 'onLoad' : 'onView',
          duration: input.duration,
        },
      };
    }
    if (input.effect === 'textReveal') {
      const { when: _when, effect: _effect, ...options } = input;
      return { key: 'textReveal', options };
    }
    if (input.when === 'hover') {
      return { key: 'textSlide', options: { duration: input.duration, hoverColor: input.hoverColor } };
    }
    if ('steps' in input) {
      return {
        key: input.effect,
        options: {
          steps: input.steps,
          currentStep: input.currentStep,
          duration: input.duration,
          clipHeight: input.clipHeight,
        },
      };
    }
    if (input.effect === 'textSlide') {
      return {
        key: 'textSlide',
        options: { mode: 'swap', duration: input.duration, ...(input.by ? { by: input.by } : {}) },
      };
    }
  }

  return {};
}

/**
 * Резолвит проп анимации в активный плагин из реестра: парсит ключ+опции, проверяет isActive плагина.
 * Pure (без хуков) — Text вызывает один раз и либо рендерит `Inner`, либо контент как есть.
 */
export function resolveAnimation(
  input: TextAnimate | undefined,
  content: ReactNode,
): ResolvedAnimation {
  const { key, options } = parse(input);
  const plugin = key ? animationRegistry[key] : undefined;
  if (!plugin) return { active: false };

  const active = plugin.isActive ? plugin.isActive(options, content) : true;
  return active ? { active, Inner: plugin.Inner, options } : { active: false };
}
