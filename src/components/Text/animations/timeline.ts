import type { MotionTime } from '../../../core/base/timing';
import { isRevealKey, type RevealKey, type RevealOptions } from '../../../core/reveal/reveal';

export type TextEffectKey = RevealKey | 'counter';
export interface EffectStartAt {
  effect: TextEffectKey;
  /** Доля длительности зависимости, без её задержки и easing: 0…1. */
  progress: number;
}
export interface EffectTiming {
  duration?: MotionTime;
  delay?: MotionTime;
  startAt?: EffectStartAt;
}
export type TimelineAppearance = EffectTiming & Pick<RevealOptions, 'distance' | 'fade'>;
export interface TimelineCounter extends EffectTiming {
  start?: number;
  to?: number;
  suffix?: string;
  grouped?: boolean;
}
type AppearanceMap = { [K in RevealKey]?: TimelineAppearance };
// Один эффект коробки: up/left/scale и т. п. управляют одними CSS-свойствами.
type OneAppearance = { [K in RevealKey]: Required<Pick<AppearanceMap, K>> & Partial<Record<Exclude<RevealKey, K>, never>> }[RevealKey];
export type TextTimelineAnimate = Pick<RevealOptions, 'once' | 'threshold' | 'rootMargin' | 'delay'> & {
  when: 'inView' | 'load';
  effect: (OneAppearance & { counter?: TimelineCounter }) | (Partial<Record<RevealKey, never>> & { counter: TimelineCounter });
};

export function isTextTimeline(value: unknown): value is TextTimelineAnimate {
  if (!value || typeof value !== 'object') return false;
  const input = value as TextTimelineAnimate;
  return (input.when === 'inView' || input.when === 'load') && !!input.effect && typeof input.effect === 'object' && !Array.isArray(input.effect);
}

export type EffectWindow = { start: number; duration: number; end: number };
export type TextTimeline = { effects: Partial<Record<TextEffectKey, EffectWindow>>; end: number };

/** Чистый граф зависимостей. readTime резолвит локальные токены темы только после mount. */
export function resolveTextTimeline(input: TextTimelineAnimate, readTime: (time: MotionTime) => number): TextTimeline {
  const entries = Object.entries(input.effect).filter(([, options]) => options != null) as [TextEffectKey, EffectTiming][];
  if (!entries.length) throw new Error('Text animate.effect must contain an effect');
  if (entries.filter(([key]) => isRevealKey(key)).length > 1) throw new Error('Text timeline supports one appearance effect');
  const effects: TextTimeline['effects'] = {};
  const visiting = new Set<string>();
  const baseDelay = readTime(input.delay ?? 0);
  const visit = (key: TextEffectKey): EffectWindow => {
    if (effects[key]) return effects[key];
    const options: EffectTiming | undefined = input.effect[key];
    if (!options || (key !== 'counter' && !isRevealKey(key))) throw new Error(`Unknown Text effect dependency: ${key}`);
    if (visiting.has(key)) throw new Error(`Cyclic Text effect dependency: ${key}`);
    visiting.add(key);
    let start = baseDelay;
    if (options.startAt) {
      const { effect, progress } = options.startAt;
      if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new Error('Text startAt.progress must be between 0 and 1');
      const dependency = visit(effect);
      start = dependency.start + dependency.duration * progress;
    }
    start += readTime(options.delay ?? 0);
    const duration = readTime(options.duration ?? (key === 'counter' ? 'counter' : 'slow'));
    const window = { start, duration, end: start + duration };
    effects[key] = window;
    visiting.delete(key);
    return window;
  };
  entries.forEach(([key]) => visit(key));
  return { effects, end: Math.max(...Object.values(effects).map((effect) => effect.end)) };
}

export function effectProgress(window: EffectWindow, elapsed: number): number {
  if (elapsed < window.start) return 0;
  if (window.duration === 0) return 1;
  return Math.max(0, Math.min(1, (elapsed - window.start) / window.duration));
}
