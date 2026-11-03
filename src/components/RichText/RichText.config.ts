import type { RichTextChangeAnimate } from './RichText.types';

export function isRichTextSequence(value: unknown): value is RichTextChangeAnimate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as Partial<RichTextChangeAnimate>;
  return input.when === 'change' && (input.effect === 'textSlide' || input.effect === 'textClip');
}
