'use client';

import Link from 'next/link';
import { CollapseWrap } from '../Collapse/CollapseWrap';
import { Flex } from '../Flex';
import { useIconSwap } from './swap';
import { IconGlyph } from './IconGlyph/IconGlyph';
import { useIcon } from './useIcon';
import type { IconProps } from './Icon.types';
import type { WithRef } from '../../core';

export type { IconProps } from './Icon.types';

export function Icon(props: WithRef<IconProps, SVGSVGElement>) {
  const view = useIcon(props);
  const visual = view.visual.kind === 'glyph'
    ? <IconGlyph {...view.visual.glyph} />
    : (
        <span ref={view.visual.ref} {...view.visual.props}>
          <IconGlyph {...view.visual.defaultGlyph} />
          <IconGlyph {...view.visual.hoverGlyph} />
        </span>
      );
  const frame = view.frame
    ? <Flex ref={view.frame.ref} {...view.frame.props}>{visual}</Flex>
    : visual;
  const swapped = useIconSwap(view.swap.animate, view.swap.identity, view.swap.ready, frame);

  const hasSource = view.visual.kind === 'glyph'
    ? view.visual.glyph.source.kind !== 'empty'
    : view.visual.defaultGlyph.source.kind !== 'empty';
  if (!hasSource) return null;

  let content = swapped;
  if (view.link) {
    const LinkRoot = view.link.kind === 'next' ? Link : 'a';
    content = <LinkRoot {...view.link.props}>{swapped}</LinkRoot>;
  }
  const result = <>{content}{view.tooltip}</>;

  if (!view.collapse) return result;
  return <CollapseWrap {...view.collapse} as="span" inline axis={view.collapse.axis ?? 'column'}>{result}</CollapseWrap>;
}
