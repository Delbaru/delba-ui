'use client';

import type { CSSProperties } from 'react';
import { boxLayout, createLayoutClasses, cx, type WithRef } from '#core';
import { useElement } from '#core/Element';
import { motionTimeCss } from '../../core/base/timing';
import { useAnimationVisibility } from '../../hooks/useAnimationVisibility';
import { GRADIENT_BORDER_WIDTH } from './GradientBorder.config';
import type { GradientBorderProps } from './GradientBorder.types';
import styles from './GradientBorder.module.scss';

const c = createLayoutClasses();

export function useGradientBorder({
  ref, gradient, width = GRADIENT_BORDER_WIDTH, animate, className, style,
}: WithRef<GradientBorderProps, HTMLSpanElement>) {
  const trace = animate?.idle;
  const visibilityRef = useAnimationVisibility(Boolean(trace));
  const traceStyle: (CSSProperties & { '--gradient-border-duration': string }) | undefined = trace
    ? { '--gradient-border-duration': motionTimeCss(trace.duration) }
    : undefined;
  const element = useElement({ ref, refs: [visibilityRef], style: { ...traceStyle, ...style } });

  return {
    ref: element.ref,
    className: cx(styles.GradientBorder, trace && styles.Trace, ...boxLayout(c, { bg: gradient, p: width }), className),
    style: element.style,
  };
}
