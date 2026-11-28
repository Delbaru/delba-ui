import type { CSSProperties } from 'react';
import type { ResponsiveValue } from '#core';
import type { MotionTime } from '../../core/base/timing';

export interface GradientBorderProps {
  /** CSS-gradient или var(--token), кортеж [desktop, mobile, tablet]. */
  gradient: ResponsiveValue<string>;
  /** Толщина декоративной рамки в дизайн-пикселях. По умолчанию 1. */
  width?: ResponsiveValue<number>;
  /** Continuous contour highlight pauses offscreen and respects reduced motion. */
  animate?: { idle?: { effect: 'trace'; duration: MotionTime; when?: never } | false };
  className?: string;
  style?: CSSProperties;
}
