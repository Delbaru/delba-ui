import { useEffect, useMemo, useState } from 'react';
import {
  boxLayout, buildClampStyle, createLayoutClasses, cx, getBreakpointIndex,
  resolveResponsiveAtBreakpoint, splitBoxLayout, type WithRef,
} from '#core';
import { useInteractiveElement } from '#core/Element';
import { DEFAULT_LEXICAL_TEXT_LINKS, DEFAULT_LEXICAL_TEXT_VARIANT, resolveRichTextSequence } from './LexicalText.config';
import { richTextContent } from './RichText.content';
import type { LexicalTextProps } from './LexicalText.types';
import styles from './LexicalText.module.scss';

const c = createLayoutClasses();

export function useLexicalText({
  ref, content, variant = DEFAULT_LEXICAL_TEXT_VARIANT, animate, links = DEFAULT_LEXICAL_TEXT_LINKS,
  rows, ellipsis, color, className, style, perspective3d, parallax, ui, linkState, ...props
}: WithRef<LexicalTextProps, HTMLDivElement>) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [breakpoint, setBreakpoint] = useState<0 | 1 | 2>(0);
  const responsive = Array.isArray(variant) && new Set(variant).size > 1;

  useEffect(() => {
    const document = root?.ownerDocument;
    const view = document?.defaultView;
    if (!responsive || !document || !view) return undefined;
    const update = () => setBreakpoint(getBreakpointIndex(document.documentElement.clientWidth || view.innerWidth));
    update();
    view.addEventListener('resize', update);
    return () => view.removeEventListener('resize', update);
  }, [responsive, root]);

  const body = useMemo(() => richTextContent(content, links), [content, links]);
  const sequence = resolveRichTextSequence(content, animate);
  const { box, rest } = splitBoxLayout(props);
  const preset = resolveResponsiveAtBreakpoint(variant, 'default', breakpoint);
  const popup = ui?.popup;
  const preview = (rows !== undefined || ellipsis) && body.preview ? {
    text: body.preview,
    className: cx(styles.previewText, rows !== undefined ? styles.clamp : styles.ellipsis),
    style: buildClampStyle(rows),
  } : undefined;
  const element = useInteractiveElement({
    ref,
    refs: [responsive ? setRoot : undefined],
    motion: { animate, perspective3d, parallax },
    popup,
    linkState,
    className: cx(
      styles.LexicalText, styles.RichText, styles[preset], sequence && styles.sequence,
      ...boxLayout(c, box), ...c.value('color', color), className,
    ),
    root: { ...rest, style, tabIndex: rest.tabIndex ?? (popup && popup.preset !== 'tooltip' ? 0 : undefined) },
  });

  return {
    ...element,
    content: body,
    visible: Boolean(sequence) || !body.empty,
    sequence,
    links,
    preview,
  };
}
