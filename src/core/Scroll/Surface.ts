'use client';

import type { ResponsiveValue } from '../index';
import { scrollbarProps, type ScrollbarOptions } from '../../components/ScrollArea/scrollbar';
import { useScrollbarActivity } from '../../components/ScrollArea/ScrollbarActivity';

type ScrollSize = ResponsiveValue<number> | { min?: ResponsiveValue<number>; max?: ResponsiveValue<number> };

export interface ScrollOptions {
  preset: 'default' | 'feed';
  axis?: 'x' | 'y';
  fade?: boolean;
  scrollbar?: ScrollbarOptions;
  /** Layout uses the same RPX resolver as Flex. Explicit Flex props take precedence. */
  height?: ScrollSize;
  width?: ScrollSize;
  p?: { top?: ResponsiveValue<number>; right?: ResponsiveValue<number>; bottom?: ResponsiveValue<number>; left?: ResponsiveValue<number> };
}

/** Existing ScrollArea decoration on the existing Flex DOM node. */
export function useScrollSurface(options?: ScrollOptions) {
  useScrollbarActivity(Boolean(options));
  if (!options) return undefined;
  const axis = options.axis ?? 'y';
  const decoration = scrollbarProps(options.scrollbar);
  const size = (value?: ScrollSize) => {
    const range = value && typeof value === 'object' && !Array.isArray(value)
      ? value as { min?: ResponsiveValue<number>; max?: ResponsiveValue<number> } : undefined;
    return { value: range ? undefined : value as ResponsiveValue<number> | undefined, min: range?.min, max: range?.max };
  };
  const height = size(options.height);
  const width = size(options.width);
  return {
    axis,
    fade: options.fade ? axis : false as const,
    className: 'ui-scroll-area ' + decoration.className,
    style: decoration.style,
    layout: { h: height.value, minH: height.min, maxH: height.max,
      w: width.value, minW: width.min, maxW: width.max,
      pt: options.p?.top, pr: options.p?.right, pb: options.p?.bottom, pl: options.p?.left },
  };
}
