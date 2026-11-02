import { resolveResponsiveAtBreakpoint, type ResponsiveInput } from '../../core/base/responsive';
import type { AnimationInput, AnimationKey, RichTextChangeAnimate, TextClipOptions, TextSlideOptions } from './RichText.types';

export function isRichTextSequence(value: unknown): value is RichTextChangeAnimate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as Partial<RichTextChangeAnimate>;
  return input.when === 'change' && (input.effect === 'textSlide' || input.effect === 'textClip');
}

/** Decode the former public shape at the boundary; sequence rendering has one contract. */
export function resolveRichTextSequence(
  animate: unknown,
  legacy: ResponsiveInput<AnimationInput> | undefined,
  breakpoint: 0 | 1 | 2,
): RichTextChangeAnimate | undefined {
  if (isRichTextSequence(animate)) return animate;
  if (!legacy) return undefined;

  const input = Array.isArray(legacy) && legacy.length === 3
    ? resolveResponsiveAtBreakpoint(legacy as [AnimationInput | null, AnimationInput | null, AnimationInput | null], undefined, breakpoint)
    : legacy as AnimationInput;
  const key: AnimationKey | undefined = typeof input === 'string' ? input : input?.[0];
  const options = Array.isArray(input) ? input[1] as TextSlideOptions | TextClipOptions | undefined : undefined;
  if ((key !== 'textSlide' && key !== 'textClip') || !options?.steps) return undefined;

  return { when: 'change', effect: key, ...options };
}
