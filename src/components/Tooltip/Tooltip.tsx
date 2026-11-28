'use client';

import { createPortal } from 'react-dom';
import type { WithRef } from '#core';
import { useTooltipSurface } from './Tooltip.model';
import type { TooltipProps } from './Tooltip.types';

/** Portal view for the positioning and visibility model supplied by useTooltip. */
export function Tooltip(props: WithRef<TooltipProps, HTMLElement>) {
  const { host: Surface, root, portalNode, children } = useTooltipSurface(props);
  if (!portalNode) return null;

  return createPortal(<Surface {...root}>{children}</Surface>, portalNode);
}
