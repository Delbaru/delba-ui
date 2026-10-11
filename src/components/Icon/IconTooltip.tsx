'use client';

import { createPortal } from 'react-dom';
import { useCallback, useId } from 'react';
import type React from 'react';

import { stateProps as buildStateProps } from '../../core';
import { useTooltip } from '../../hooks/useTooltip';

export type IconTooltipDirection = 'right' | 'left' | 'top' | 'bottom';

/** Якорит подсказку на реальном DOM-элементе Icon, в том числе на inline SVG. */
export function useIconTooltip(tooltip: React.ReactNode, direction: IconTooltipDirection, gap: number) {
  const hasTooltip = Boolean(tooltip);
  const id = useId();
  const {
    anchorRef,
    tooltipRef,
    anchorHandlers,
    bubbleProps,
  } = useTooltip<Element, HTMLSpanElement>({
    enabled: hasTooltip,
    direction,
    align: 'center',
    gap,
    viewportPadding: 8,
    keepPositionWhenInactive: true,
    lazyPortal: true,
  });

  // Cleanup is conditional because swap may temporarily mount old and new anchors together.
  const setAnchor = useCallback((node: Element | null) => {
    anchorRef.current = node;
    if (!node) return;

    return () => {
      if (anchorRef.current === node) anchorRef.current = null;
    };
  }, [anchorRef]);

  const bubble = hasTooltip && bubbleProps.portalNode
    ? createPortal(
        <span
          ref={tooltipRef}
          id={id}
          className="ui-icon-tooltip"
          style={bubbleProps.style}
          data-placement={bubbleProps.placement}
          role="tooltip"
          {...buildStateProps(bubbleProps.active && 'active')}
        >
          {tooltip}
        </span>,
        bubbleProps.portalNode,
      )
    : null;

  return {
    setAnchor,
    handlers: anchorHandlers,
    bubble,
    describedBy: hasTooltip ? id : undefined,
  };
}
