'use client';

import type { CSSProperties } from 'react';
import { buildClampStyle, createLayoutClasses, cx } from '../../core';
import { Box } from '../Box';
import { useRichText } from './RichText.model';
import { RichTextSequence } from './RichTextSequence/RichTextSequence';
import type { LexicalTextProps } from './RichText.types';
import styles from './LexicalText.module.scss';

const layoutClasses = createLayoutClasses();

export type { LexicalTextProps, LexicalTextVariant, RichTextChangeAnimate } from './RichText.types';

/** Safe rich HTML or a validated Lexical document, with shared layout and motion. */
export function LexicalText({ content, variant, animate, rows, ellipsis, links = 'active', color, className, style, ...props }: LexicalTextProps) {
  const text = useRichText({ content, variant, animate, links });
  const preview = rows !== undefined || Boolean(ellipsis);
  if (!text.sequence && text.content.empty) return null;

  return (
    <Box
        {...props}
        ref={text.rootRef}
        animate={text.appearance}
        className={cx(
            styles.LexicalText,
            styles.RichText,
            ...layoutClasses.value('color', color),
            styles[text.variant],
            text.sequence && styles.sequence,
            className,
        )}
        style={style as CSSProperties}
    >
      {text.sequence ? (
        <RichTextSequence sequence={text.sequence} links={links} />
      ) : preview && text.content.preview ? (
        <p
            className={cx(styles.previewText, rows !== undefined ? styles.clamp : styles.ellipsis)}
            style={buildClampStyle(rows)}
        >
          {text.content.preview}
        </p>
      ) : text.content.render(styles)}
    </Box>
  );
}
