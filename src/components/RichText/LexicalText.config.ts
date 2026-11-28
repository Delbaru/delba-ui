import type { LexicalTextProps, RichTextChangeAnimate } from './LexicalText.types';

export const DEFAULT_LEXICAL_TEXT_VARIANT = ['default', 'default', 'default'] as const;
export const DEFAULT_LEXICAL_TEXT_LINKS = 'active';

export function resolveRichTextSequence(
  content: LexicalTextProps['content'],
  animate: LexicalTextProps['animate'],
): RichTextChangeAnimate | undefined {
  if (content && typeof content === 'object') return undefined;
  const change = animate?.change;
  if (!change || (change.effect !== 'textSlide' && change.effect !== 'textClip')) return undefined;
  if (!Array.isArray(change.steps) || typeof change.currentStep !== 'number') return undefined;
  return change;
}
