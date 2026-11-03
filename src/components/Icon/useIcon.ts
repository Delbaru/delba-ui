'use client';

import type { WithRef } from '../../core';
import type { IconProps } from './Icon.types';
import { resolveIconPresentation, needsIconFrame, resolveIconStructure, type IconPresentationRecords } from './Icon.model';
import { useIconInteractions } from './useIconInteractions';
import { useIconSources } from './useIconSources';
import type { IconAnimate } from './swap';

export type IconViewModel = IconPresentationRecords & {
  tooltip: React.ReactNode;
  swap: { animate: IconAnimate | undefined; identity: string | number | null; ready: boolean };
  collapse: IconProps['collapse'];
};

/** Coordinates the source, target, and presentation owners for one Icon render. */
export function useIcon(props: WithRef<IconProps, SVGSVGElement>): IconViewModel {
  const sources = useIconSources({
    src: props.src,
    name: props.name,
    component: props.component,
    hover: props.hover,
    normalizePaint: props.fill != null || props.stroke != null || props.strokeWidth != null,
  });
  const structure = resolveIconStructure({
    hasFrame: needsIconFrame(props),
    hasLink: Boolean(props.href),
    hasHover: sources.hasHover,
  });
  const interaction = useIconInteractions({
    ref: props.ref,
    structure,
    tooltip: props.tooltip,
    tooltipDirection: props.tooltipDirection ?? 'right',
    tooltipGap: props.tooltipGap ?? 8,
    ariaDescribedBy: props['aria-describedby'],
    perspective3d: props.perspective3d,
    parallax: props.parallax,
    animate: props.animate,
    linkState: props.linkState,
    onClick: props.onClick,
    onMouseEnter: props.onMouseEnter,
    onMouseLeave: props.onMouseLeave,
    onMouseMove: props.onMouseMove,
    onMouseDown: props.onMouseDown,
    onMouseUp: props.onMouseUp,
    onFocus: props.onFocus,
    onBlur: props.onBlur,
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
  });
  const presentation = resolveIconPresentation(props, sources, interaction, structure);

  return {
    ...presentation,
    tooltip: interaction.tooltip.bubble,
    swap: { animate: props.animate as IconAnimate | undefined, identity: sources.identity, ready: sources.ready },
    collapse: props.collapse,
  };
}
