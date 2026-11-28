import type { LexicalTextareaProps } from '../../../src/components/RichTextarea';

export const editor = {
  animate: {
    appearance: { when: 'inView', effect: 'up' },
    hover: { effect: 'rise' },
    idle: { effect: 'glow' },
  },
} satisfies LexicalTextareaProps;

// @ts-expect-error the editor preserves its editable document and has no keyed change effect
export const documentSwap = { animate: { change: { effect: 'fade', key: 'new-document' } } } satisfies LexicalTextareaProps;
