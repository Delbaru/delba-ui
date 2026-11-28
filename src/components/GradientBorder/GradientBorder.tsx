'use client';

import type { WithRef } from '#core';
import { useGradientBorder } from './GradientBorder.model';
import type { GradientBorderProps } from './GradientBorder.types';

/** Decorative contour of the positioned parent. */
export function GradientBorder(props: WithRef<GradientBorderProps, HTMLSpanElement>) {
  const root = useGradientBorder(props);
  return <span {...root} aria-hidden="true" data-reveal-skip />;
}
