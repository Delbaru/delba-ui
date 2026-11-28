'use client';

import type { WithRef } from '#core';
import { ElementFrame } from '#core/Element';
import { MotionLayers } from '#core/Motion';
import { Text } from '../Text';
import { useLexicalTextareaSurface } from './LexicalTextarea.model';
import type { LexicalTextareaProps } from './LexicalTextarea.types';
import { LexicalTextareaField } from './LexicalTextareaField/LexicalTextareaField';
import type { LexicalTextareaHandle } from './types';

export type { LexicalTextareaProps } from './LexicalTextarea.types';

/** Formatted document editor; the ref exposes document commands. */
export function LexicalTextarea(props: WithRef<LexicalTextareaProps, LexicalTextareaHandle>) {
  const { host: Host, root, collapse, popup, effects, label, field, feedback } = useLexicalTextareaSurface(props);

  return (
    <ElementFrame collapse={collapse} popup={popup}>
      <Host {...root}>
        <MotionLayers effects={effects} />
        {label && <Text mb={[8, 4, 8]} {...label} />}
        <LexicalTextareaField {...field} />
        {feedback.text && (
          <Text
              variant={['caption', 'caption', 'caption']}
              mt={[8, 4, 8]}
              id={feedback.id}
              color={feedback.color}
              role={feedback.error ? 'alert' : undefined}
          >
            {feedback.text}
          </Text>
        )}
      </Host>
    </ElementFrame>
  );
}
