import type { ComponentType, ReactNode } from 'react';

import type { ResponsiveInput } from '../../../core';
import { animationRegistry } from './registry';
import type { AnimationInput, AnimationKey, AnimationOptions, TextAnimate, TextAnimationContext } from './types';

export interface ResolvedAnimation {
  active: boolean;
  Inner?: ComponentType<TextAnimationContext<AnimationOptions>>;
  options?: AnimationOptions;
}

// Разбор пропа `animate`/`animation` в пару (ключ, опции). responsive-форма [d, m, t] — берём desktop
// (рендер всё равно одноключевой); одиночное значение — ключ или [ключ, опции].
function parse(input: ResponsiveInput<AnimationInput> | TextAnimate | undefined): { key?: AnimationKey; options?: AnimationOptions } {
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
          trigger: input.when === 'load' ? 'onLoad' : 'onView',
          durationTime: input.duration,
        },
      };
    }
    if (input.effect === 'textSlide') {
      return { key: 'textSlide', options: { mode: 'swap', durationTime: input.duration, ...(input.by ? { by: input.by } : {}) } };
    }
  }

  const normalize = (v: AnimationInput): { key: AnimationKey; options?: AnimationOptions } =>
    Array.isArray(v)
      ? { key: v[0] as AnimationKey, options: v.length >= 2 ? (v[1] as AnimationOptions) : undefined }
      : { key: v as AnimationKey };

  if (Array.isArray(input) && input.length === 3) {
    const desktop = input[0];
    return desktop != null ? normalize(desktop as AnimationInput) : {};
  }

  return normalize(input as AnimationInput);
}

/**
 * Резолвит проп анимации в активный плагин из реестра: парсит ключ+опции, проверяет isActive плагина.
 * Pure (без хуков) — Text вызывает один раз и либо рендерит `Inner`, либо контент как есть.
 */
export function resolveAnimation(
  input: ResponsiveInput<AnimationInput> | TextAnimate | undefined,
  content: ReactNode
): ResolvedAnimation {
  const { key, options } = parse(input);
  const plugin = key ? animationRegistry[key] : undefined;
  if (!plugin) return { active: false };

  const active = plugin.isActive ? plugin.isActive(options, content) : true;
  return active ? { active, Inner: plugin.Inner, options } : { active: false };
}
