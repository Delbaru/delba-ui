'use client';

import type React from 'react';

import { motionTimeCss, type MotionTime } from '../../core/base/timing';
import { useMergedRefs } from '../../core';
import { useAnimationVisibility } from '../../hooks/useAnimationVisibility';

import { boxLayout, createLayoutClasses, cx, type ResponsiveValue, type WithRef } from '../../core';

const c = createLayoutClasses();

export interface GradientBorderProps {
    /** CSS-gradient или var(--token), кортеж [desktop, mobile, tablet]. */
    gradient: ResponsiveValue<string>;
    /** Толщина декоративной рамки в дизайн-пикселях; по умолчанию 1. Раскладку не меняет. */
    width?: ResponsiveValue<number>;
    /** Continuous contour highlight; pauses offscreen and respects reduced motion. */
    animate?: { when: 'idle'; effect: 'trace'; duration: MotionTime };
    /** Дополнительное оформление декоративного слоя. */
    className?: string;
    /** Inline-переменные или непропсовое оформление слоя. */
    style?: React.CSSProperties;
}

/** Рамка внутри позиционированного родителя. Наследует его радиус, центр прозрачен, клики проходят насквозь. */
export function GradientBorder({ ref, gradient, width, animate, className, style }: WithRef<GradientBorderProps, HTMLSpanElement>) {
    const visibilityRef = useAnimationVisibility(!!animate);
    const mergedRef = useMergedRefs(ref, visibilityRef);
    return (
        <span
            ref={mergedRef}
            aria-hidden="true"
            data-reveal-skip
            className={cx('ui-gradient-border', animate && 'ui-gradient-border--trace', ...boxLayout(c, { bg: gradient, p: width ?? [1, 1, 1] }), className)}
            style={{ ...(animate ? { '--gradient-border-duration': motionTimeCss(animate.duration) } as React.CSSProperties : undefined), ...style }}
        />
    );
}
