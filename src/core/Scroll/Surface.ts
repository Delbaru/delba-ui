'use client';

import type { ResponsiveValue } from '../index';
import { scrollbarProps, type ScrollbarOptions } from '../../components/ScrollArea/scrollbar';
import { useScrollbarActivity } from '../../components/ScrollArea/ScrollbarActivity';

export interface ScrollOptions {
  preset: 'default' | 'feed';
  axis?: 'x' | 'y';
  fade?: boolean;
  scrollbar?: ScrollbarOptions;
  /** Layout uses the same RPX resolver as Flex. Explicit Flex props take precedence. */
  height?: ResponsiveValue<number> | { min?: ResponsiveValue<number>; max?: ResponsiveValue<number> };
  width?: ResponsiveValue<number>;
  p?: { right?: ResponsiveValue<number> };
}

/** Existing ScrollArea decoration on the existing Flex DOM node. */
export function useScrollSurface(options?: ScrollOptions) {
  useScrollbarActivity(Boolean(options));
  if (!options) return undefined;
  const axis = options.axis ?? 'y';
  const decoration = scrollbarProps(options.scrollbar);
  const height = options.height;
  const range = height && typeof height === 'object' && !Array.isArray(height)
    ? height as { min?: ResponsiveValue<number>; max?: ResponsiveValue<number> }
    : undefined;
  return {
    axis,
    fade: options.fade ? axis : false as const,
    className: 'ui-scroll-area ' + decoration.className,
    style: decoration.style,
    layout: { h: range ? undefined : height as ResponsiveValue<number> | undefined,
      minH: range?.min, maxH: range?.max, w: options.width, pr: options.p?.right },
  };
}
