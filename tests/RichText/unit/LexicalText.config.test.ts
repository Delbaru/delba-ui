import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRichTextSequence } from '../../../src/components/RichText/LexicalText.config';
import type { LexicalTextProps } from '../../../src/components/RichText';

test('rich HTML sequence changes compose with host appearance', () => {
  const animate = {
    appearance: { when: 'load', effect: 'up' },
    change: { effect: 'textClip', steps: ['<p>First</p>', '<p>Second</p>'], currentStep: 1 },
  } satisfies LexicalTextProps['animate'];

  assert.equal(resolveRichTextSequence('<p>Current</p>', animate), animate.change);
  assert.equal(resolveRichTextSequence(undefined, animate), animate.change);
  assert.equal(resolveRichTextSequence('Static', { appearance: animate.appearance }), undefined);
  assert.equal(resolveRichTextSequence({ root: { children: [] } }, animate), undefined);
});
