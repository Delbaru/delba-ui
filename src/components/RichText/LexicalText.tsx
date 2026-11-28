'use client';

import type { WithRef } from '#core';
import { ElementFrame } from '#core/Element';
import { MotionLayers } from '#core/Motion';
import { useLexicalText } from './LexicalText.model';
import { RichTextSequence } from './RichTextSequence/RichTextSequence';
import type { LexicalTextProps } from './LexicalText.types';
import styles from './LexicalText.module.scss';

/** Safe rich HTML or a validated Lexical document. */
export function LexicalText(props: WithRef<LexicalTextProps, HTMLDivElement>) {
  const { host: Host, root, popup, effects, visible, content, sequence, links, preview } = useLexicalText(props);
  if (!visible) return null;

  return (
    <ElementFrame popup={popup}>
      <Host {...root}>
        <MotionLayers effects={effects} />
        {sequence ? (
          <RichTextSequence sequence={sequence} links={links} />
        ) : preview ? (
          <p className={preview.className} style={preview.style}>{preview.text}</p>
        ) : content.render(styles)}
      </Host>
    </ElementFrame>
  );
}
