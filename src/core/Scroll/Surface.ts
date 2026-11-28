'use client';

import type { ResponsiveValue } from '../index';
import { cx } from '../base/cn';
import { scrollbarProps, type ScrollbarOptions } from '../../components/ScrollArea/scrollbar';
import { useScrollbarActivity } from '../../components/ScrollArea/ScrollbarActivity';
import { useSmoothSurface, type SmoothOptions } from './Smooth';
import styles from './Surface.module.scss';

type ScrollSize = ResponsiveValue<number> | { min?: ResponsiveValue<number>; max?: ResponsiveValue<number> };

interface ScrollDecoration {
  fade?: boolean;
  scrollbar?: ScrollbarOptions;
  /** Layout uses the same RPX resolver as Flex. Explicit Flex props take precedence. */
  height?: ScrollSize;
  width?: ScrollSize;
  p?: { top?: ResponsiveValue<number>; right?: ResponsiveValue<number>; bottom?: ResponsiveValue<number>; left?: ResponsiveValue<number> };
}

export type ScrollOptions =
  | (ScrollDecoration & { preset: 'default' | 'feed'; axis?: 'x' | 'y' })
  | (Extract<SmoothOptions, { target: 'window' }> & { preset: 'smooth' })
  | (Extract<SmoothOptions, { target: 'self' }> & ScrollDecoration & { preset: 'smooth'; axis?: 'y' });

/** Set up scrolling on the Flex DOM node or on its owner document's window. */
export function useScrollSurface(options?: ScrollOptions) {
  const smooth = useSmoothSurface(options?.preset === 'smooth' ? options : undefined);
  const native = options?.preset === 'smooth' && options.target === 'window' ? undefined : options;
  useScrollbarActivity(Boolean(native));
  if (!options) return undefined;
  const axis = native ? native.axis ?? 'y' : undefined;
  const decoration = native ? scrollbarProps(native.scrollbar) : undefined;
  const size = (value?: ScrollSize) => {
    const range = value && typeof value === 'object' && !Array.isArray(value)
      ? value as { min?: ResponsiveValue<number>; max?: ResponsiveValue<number> } : undefined;
    return { value: range ? undefined : value as ResponsiveValue<number> | undefined, min: range?.min, max: range?.max };
  };
  const height = size(native?.height);
  const width = size(native?.width);
  return {
    preset: options.preset,
    axis,
    ref: smooth?.ref,
    scope: smooth?.scope,
    fade: native ? native.fade ? axis : false as const : undefined,
    className: native ? cx(styles.Surface, smooth && styles.Smooth, decoration?.className) : undefined,
    style: decoration?.style,
    layout: native ? { h: height.value, minH: height.min, maxH: height.max,
      w: width.value, minW: width.min, maxW: width.max,
      pt: native.p?.top, pr: native.p?.right, pb: native.p?.bottom, pl: native.p?.left } : undefined,
  };
}
