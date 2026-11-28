'use client';

import { ElementFrame, useInteractiveElement, type InteractiveRootProps } from '#core/Element';
import { MotionLayers } from '#core/Motion';
import type { ReactNode } from 'react';
import type { TooltipPopup } from '../../core/Popup/Popup';
import { useIconSwap } from './swap';
import { IconGlyph } from './IconGlyph/IconGlyph';
import { useIcon } from './Icon.model';
import type { IconProps } from './Icon.types';
import type { WithRef } from '#core';

function IconLink({ root, popup, children }: { root: InteractiveRootProps; popup?: TooltipPopup; children: ReactNode }) {
  const link = useInteractiveElement({ root, popup });
  const Host = link.host;

  return <ElementFrame popup={link.popup}><Host {...link.root}>{children}</Host></ElementFrame>;
}

export function Icon(props: WithRef<IconProps, SVGSVGElement>) {
  const view = useIcon(props);
  const glyph = <IconGlyph {...view.glyph} />;
  const visual = view.stack ? (
    <span {...view.stack.root}>
      {glyph}
      <IconGlyph {...view.stack.glyph} />
    </span>
  ) : glyph;
  const frame = view.frame ? (
    <span {...view.frame}>
      <MotionLayers effects={view.effects} />
      {visual}
    </span>
  ) : visual;
  const swapped = useIconSwap(view.change, view.identity, view.ready, frame);

  if (!view.hasSource) return null;

  return (
    <ElementFrame collapse={view.collapse} popup={view.popup}>
      {view.link ? <IconLink {...view.link}>{swapped}</IconLink> : swapped}
    </ElementFrame>
  );
}
