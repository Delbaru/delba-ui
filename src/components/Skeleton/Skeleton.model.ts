'use client';

import { cx } from '#core';
import type { FlexProps } from '../Flex';
import { useAnimationVisibility } from '../../hooks/useAnimationVisibility';
import { SKELETON_DEFAULTS } from './Skeleton.config';
import type { SkeletonProps } from './Skeleton.types';
import styles from './Skeleton.module.scss';

export function useSkeleton({
    w = SKELETON_DEFAULTS.w,
    h = SKELETON_DEFAULTS.h,
    r = SKELETON_DEFAULTS.r,
    rows = SKELETON_DEFAULTS.rows,
    gap = SKELETON_DEFAULTS.gap,
    className,
}: SkeletonProps) {
    const ref = useAnimationVisibility();
    const stripe: FlexProps = {
        h, r,
        bg: ['var(--line)', 'var(--line)', 'var(--line)'],
        className: styles.stripe,
    };
    return {
        root: rows === 1 ? {
            ...stripe, ref, w,
            className: cx(styles.Skeleton, styles.stripe, className),
        } : {
            ref, w, gap,
            dir: ['column', 'column', 'column'] as const,
            className: cx(styles.Skeleton, className),
        },
        stripes: rows === 1 ? [] : Array.from({ length: rows }, (_, index): FlexProps => ({
            ...stripe,
            w: index === rows - 1 ? ['70%', '70%', '70%'] : ['100%', '100%', '100%'],
        })),
    };
}
