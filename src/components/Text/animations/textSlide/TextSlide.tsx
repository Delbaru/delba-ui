'use client';

import type { TextAnimationContext } from '../types';
import type { TextSlideOptions } from './types';
import { TextSlideSequence } from './TextSlideSequence/TextSlideSequence';
import { TextSlideHover } from './TextSlideHover/TextSlideHover';
import { TextSlideSwap } from './TextSlideSwap/TextSlideSwap';

/** Chooses the renderer; each mode owns its own lifecycle and DOM root. */
export function TextSlide({ content, options }: TextAnimationContext<TextSlideOptions>) {
  if (options?.steps && typeof options.currentStep === 'number') {
    return (
      <TextSlideSequence
          options={{ ...options, steps: options.steps, currentStep: options.currentStep }}
      />
    );
  }

  if (options?.mode === 'swap') return <TextSlideSwap content={content} options={options} />;

  return <TextSlideHover content={content} options={options} />;
}
