import type React from 'react';

import { boxLayout, createLayoutClasses, cx, type ResponsiveValue, type WithRef } from '../../core';

const c = createLayoutClasses();

export interface GradientBorderProps {
    /** CSS-gradient или var(--token), кортеж [desktop, mobile, tablet]. */
    gradient: ResponsiveValue<string>;
    /** Толщина декоративной рамки в дизайн-пикселях; по умолчанию 1. Раскладку не меняет. */
    width?: ResponsiveValue<number>;
    /** Дополнительное оформление декоративного слоя. */
    className?: string;
    /** Inline-переменные или непропсовое оформление слоя. */
    style?: React.CSSProperties;
}

/** Рамка внутри позиционированного родителя. Наследует его радиус, центр прозрачен, клики проходят насквозь. */
export function GradientBorder({ ref, gradient, width, className, style }: WithRef<GradientBorderProps, HTMLSpanElement>) {
    return (
        <span
            ref={ref}
            aria-hidden="true"
            data-reveal-skip
            className={cx('ui-gradient-border', ...boxLayout(c, { bg: gradient, p: width ?? [1, 1, 1] }), className)}
            style={style}
        />
    );
}
