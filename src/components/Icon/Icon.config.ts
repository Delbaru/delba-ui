import type { CSSProperties } from 'react';
import { resolveResponsive, type ResponsiveValue } from '../../core/base/responsive';

interface IconStyleOptions {
  rotate?: ResponsiveValue<number | string>;
  strokeWidth?: ResponsiveValue<number | string>;
  color?: string;
  fill?: string;
  stroke?: string;
}

function responsiveVariables(prefix: string, value: ResponsiveValue<number | string> | undefined, unit: string) {
  if (value === undefined) return undefined;
  const [desktop, mobile, tablet] = resolveResponsive(value);
  const format = (entry: number | string | null | undefined) =>
    entry == null ? undefined : typeof entry === 'number' ? `${entry}${unit}` : entry;

  return {
    [`--${prefix}-d`]: format(desktop),
    [`--${prefix}-m`]: format(mobile),
    [`--${prefix}-t`]: format(tablet),
  };
}

/** CSS units and responsive paint variables have one owner for all glyph renderers. */
export const iconStyles = {
  resolve({ rotate, strokeWidth, color, fill, stroke }: IconStyleOptions) {
    const rotation = responsiveVariables('rotate', rotate, 'deg');
    const widths = responsiveVariables('icon-stroke-width', strokeWidth, 'px');
    const strokeWidths: Record<string, string | undefined> | undefined = widths ? { '--icon-stroke-width': widths['--icon-stroke-width-d'], ...widths } : undefined;

    return {
      rotation,
      strokeWidths,
      paint: {
        ...(color && { color }),
        ...(stroke != null && { '--icon-stroke': stroke, stroke }),
        ...(fill != null && { '--icon-fill': fill, fill }),
        ...strokeWidths,
      } as CSSProperties,
    };
  },
};
