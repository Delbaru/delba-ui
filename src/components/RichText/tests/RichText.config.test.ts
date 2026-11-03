import assert from 'node:assert/strict';
import test from 'node:test';
import { isRichTextSequence } from '../RichText.config';

test('only explicit change sequences select the rich HTML renderer', () => {
  assert.equal(isRichTextSequence({ when: 'change', effect: 'textClip', steps: ['new'], currentStep: 0 }), true);
  assert.equal(isRichTextSequence({ when: 'load', effect: 'up' }), false);
  assert.equal(isRichTextSequence(['textSlide', { steps: ['old'], currentStep: 0 }]), false);
  assert.equal(isRichTextSequence(undefined), false);
});
