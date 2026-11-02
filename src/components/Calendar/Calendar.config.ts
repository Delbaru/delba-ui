import type { ResponsiveValue } from '../../core';

const direction: ResponsiveValue<'column'> = ['column', 'column', 'column'];
const spacing: ResponsiveValue<number> = [8, 8, 8];
const padding: ResponsiveValue<number> = [16, 16, 16];
const radius: ResponsiveValue<number> = [16, 16, 16];
const width: ResponsiveValue<number> = [336, 336, 336];
const border: ResponsiveValue<string> = [
  'calc(1 * var(--rpx)) solid var(--line)',
  'calc(1 * var(--rpx)) solid var(--line)',
  'calc(1 * var(--rpx)) solid var(--line)',
];
const background: ResponsiveValue<string> = [
  'var(--white-100)',
  'var(--white-100)',
  'var(--white-100)',
];
const contentHeight: ResponsiveValue<number> = [308, 308, 308];
const monthColumns: ResponsiveValue<1 | 2 | 3 | 4> = [3, 3, 3];
const monthRows: ResponsiveValue<1 | 2 | 3 | 4> = [4, 4, 4];

export const calendarConfig = {
  surface: {
    dir: direction,
    gap: spacing,
    p: padding,
    r: radius,
    w: width,
    border,
    bg: background,
  },
  contentHeight,
  monthColumns,
  monthRows,
} as const;
