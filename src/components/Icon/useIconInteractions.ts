'use client';

import type React from 'react';

import { composeEventHandlers, stateLinkProps, useMergedRefs } from '../../core';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import type { IconProps } from './Icon.types';
import type { IconAnimate } from './swap';
import type { IconStructure } from './Icon.model';
import { useIconTooltip } from './IconTooltip/IconTooltip';

type IconEventProps = Pick<IconProps,
  | 'onClick' | 'onMouseEnter' | 'onMouseLeave' | 'onMouseMove' | 'onMouseDown' | 'onMouseUp'
  | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onKeyUp' | 'linkState'
>;

interface IconInteractionOptions extends IconEventProps, Pick<SharedMotionProps<IconAnimate>, 'perspective3d' | 'parallax' | 'animate'> {
  ref?: React.Ref<SVGSVGElement>;
  structure: IconStructure;
  tooltip?: React.ReactNode;
  ariaDescribedBy?: string;
  tooltipDirection: NonNullable<IconProps['tooltipDirection']>;
  tooltipGap: number;
}

/** Event, ref, motion, and tooltip targets are selected together so ownership stays explicit. */
export function useIconInteractions(options: IconInteractionOptions) {
  const {
    ref,
    structure,
    tooltip,
    tooltipDirection,
    tooltipGap,
    perspective3d,
    parallax,
    animate,
    linkState,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onFocus,
    onBlur,
    onKeyDown,
    onKeyUp,
  } = options;
  const hasLink = structure.link !== null;
  const tooltipState = useIconTooltip(tooltip, tooltipDirection, tooltipGap);
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });
  const hasTooltip = Boolean(tooltip);
  const describedBy = [options.ariaDescribedBy, tooltipState.describedBy].filter(Boolean).join(' ') || undefined;

  const visualHandlers = stateLinkProps(linkState, {
    onClick,
    onMouseEnter: composeEventHandlers(composeEventHandlers(onMouseEnter, motionHandlers?.onMouseEnter), hasLink ? undefined : tooltipState.handlers.onMouseEnter),
    onMouseLeave: composeEventHandlers(composeEventHandlers(onMouseLeave, motionHandlers?.onMouseLeave), hasLink ? undefined : tooltipState.handlers.onMouseLeave),
    onMouseMove: composeEventHandlers(onMouseMove, motionHandlers?.onMouseMove),
    onMouseDown,
    onMouseUp,
    onFocus: hasLink ? undefined : composeEventHandlers(onFocus, tooltipState.handlers.onFocus),
    onBlur: hasLink ? undefined : composeEventHandlers(onBlur, tooltipState.handlers.onBlur),
    onKeyDown,
    onKeyUp,
  });

  const glyphRef = useMergedRefs(
    ref,
    structure.motionTarget === 'glyph' ? setMotionNode : undefined,
    structure.tooltipTarget === 'glyph' ? tooltipState.setAnchor : undefined,
  );
  const stackRef = useMergedRefs(
    structure.visual.kind === 'hover-stack' ? (structure.motionTarget === 'stack' ? setMotionNode : undefined) : undefined,
    structure.tooltipTarget === 'stack' ? tooltipState.setAnchor : undefined,
  );
  const frameRef = useMergedRefs(
    structure.frame ? (structure.motionTarget === 'frame' ? setMotionNode : undefined) : undefined,
    structure.tooltipTarget === 'frame' ? tooltipState.setAnchor : undefined,
  );
  const linkHandlers = {
    ...tooltipState.handlers,
    onFocus: composeEventHandlers(onFocus, tooltipState.handlers.onFocus),
    onBlur: composeEventHandlers(onBlur, tooltipState.handlers.onBlur),
  };

  return {
    link: structure.link ? { ref: tooltipState.setAnchor, handlers: linkHandlers } : null,
    visual: { handlers: visualHandlers },
    refs: { glyph: glyphRef, stack: stackRef, frame: frameRef },
    motion: { motionStyle, revealAttrs },
    tooltip: { has: hasTooltip, bubble: tooltipState.bubble, describedBy },
  };
}
