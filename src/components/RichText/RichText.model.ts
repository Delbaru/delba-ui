import { useEffect, useMemo, useState } from 'react';
import { getBreakpointIndex, resolveResponsiveAtBreakpoint } from '../../core';
import { isRichTextSequence } from './RichText.config';
import { richTextContent } from './RichText.content';
import type { LexicalTextProps } from './RichText.types';

/** Resolve content and responsive presentation; animation lifecycle belongs to its view. */
export function useRichText({ content, variant = ['default', 'default', 'default'], animate, links = 'active' }: LexicalTextProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [breakpoint, setBreakpoint] = useState<0 | 1 | 2>(0);
  const responsive = (Array.isArray(variant) && new Set(variant).size > 1);

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
  const sequence = typeof content === 'object' && content ? undefined : (isRichTextSequence(animate) ? animate : undefined);
  return {
    rootRef: responsive ? setRoot : undefined,
    content: body,
    sequence,
    variant: resolveResponsiveAtBreakpoint(variant, 'default', breakpoint),
    appearance: isRichTextSequence(animate) ? undefined : animate,
  };
}
