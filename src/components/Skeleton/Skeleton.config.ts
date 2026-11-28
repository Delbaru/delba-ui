import type { SkeletonProps } from './Skeleton.types';

export const SKELETON_DEFAULTS = {
    w: ['100%', '100%', '100%'],
    h: [16, 16, 16],
    r: [8, 8, 8],
    rows: 1,
    gap: [8, 8, 8],
} as const satisfies Required<Omit<SkeletonProps, 'className'>>;
