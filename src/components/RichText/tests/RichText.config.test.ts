import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRichTextSequence } from '../RichText.config';
import type { AnimationInput, RichTextChangeAnimate } from '../RichText.types';

test('object sequence is authoritative over the deprecated input', () => {
  const sequence: RichTextChangeAnimate = { when: 'change', effect: 'textClip', steps: ['new'], currentStep: 0, duration: 'fast' };
  assert.equal(resolveRichTextSequence(sequence, ['textSlide', { steps: ['old'], currentStep: 0 }], 0), sequence);
});

test('responsive boundary resolves complete sequence options and explicit skips', () => {
  const desktop: AnimationInput = ['textSlide', { steps: ['a', 'b'], currentStep: 1 }];
  const mobile: AnimationInput = ['textClip', { steps: ['a'], currentStep: 0, clipHeight: '2em' }];
  assert.deepEqual(resolveRichTextSequence(undefined, [desktop, mobile, null], 1), {
    when: 'change', effect: 'textClip', steps: ['a'], currentStep: 0, clipHeight: '2em',
  });
  assert.equal(resolveRichTextSequence(undefined, [desktop, mobile, null], 2), undefined);
  assert.equal(resolveRichTextSequence(undefined, 'counter', 0), undefined);
});
