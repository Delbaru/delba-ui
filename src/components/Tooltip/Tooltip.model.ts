'use client';

import { cx, stateProps, type WithRef } from '#core';
import { useElement } from '#core/Element';
import { TOOLTIP_DEFAULTS } from './Tooltip.config';
import type { TooltipProps } from './Tooltip.types';
import styles from './Tooltip.module.scss';

export function useTooltipSurface({
  ref, portalNode, style, placement, active, className, id,
  surface = TOOLTIP_DEFAULTS.surface,
  as = TOOLTIP_DEFAULTS.as,
  children,
}: WithRef<TooltipProps, HTMLElement>) {
  const element = useElement({ ref, style });

  return {
    host: as,
    root: {
      ref: element.ref,
      id,
      className: cx(styles.Tooltip, surface && styles.surface, className),
      style: element.style,
      role: 'tooltip' as const,
      'aria-hidden': !active,
      'data-placement': placement,
      ...stateProps(active && 'active'),
    },
    children,
    portalNode,
  };
}
