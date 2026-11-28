import type { ResponsiveValue } from '#core';

export interface SkeletonProps {
  /** Ширина полосы. По умолчанию во всю доступную. */
  w?: ResponsiveValue<number | string>;
  /** Высота одной полосы; по умолчанию 16. */
  h?: ResponsiveValue<number | string>;
  r?: ResponsiveValue<number>;
  /** Число полос; последняя строка абзаца короче остальных. */
  rows?: number;
  gap?: ResponsiveValue<number>;
  className?: string;
}
