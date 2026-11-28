import type { CSSProperties } from 'react';
import type { FontName } from '../../theme';
import type { ClassBuilder } from '../layout/layout-classes';
import type { SizeValue } from '../layout/size';
import type { ResponsiveSpaceValue, SpaceValue } from '../layout/space';
import type { ResponsiveValue } from './responsive';

// ── Prop interfaces ─────────────────────────────────────

/** Space props for layout components (SpaceValue = number | string for directional). */
export interface LayoutSpaceProps {
    p?: ResponsiveSpaceValue;
    pt?: ResponsiveValue<SpaceValue>;
    pr?: ResponsiveValue<SpaceValue>;
    pb?: ResponsiveValue<SpaceValue>;
    pl?: ResponsiveValue<SpaceValue>;
    m?: ResponsiveSpaceValue;
    mt?: ResponsiveValue<SpaceValue>;
    mr?: ResponsiveValue<SpaceValue>;
    mb?: ResponsiveValue<SpaceValue>;
    ml?: ResponsiveValue<SpaceValue>;
}

/** @deprecated Use LayoutSpaceProps. Kept as a compatibility alias while consumers migrate. */
export type NumericSpaceProps = LayoutSpaceProps;

/** Canonical size props. */
export interface SizePropsShort {
    w?: ResponsiveValue<SizeValue>;
    minW?: ResponsiveValue<SizeValue>;
    maxW?: ResponsiveValue<SizeValue>;
    h?: ResponsiveValue<SizeValue>;
    minH?: ResponsiveValue<SizeValue>;
    maxH?: ResponsiveValue<SizeValue>;
}

export type SizeInput = SizePropsShort;

/** Canonical radius props. */
export interface RadiusPropsLegacy {
    borderTLR?: ResponsiveValue<number>;
    borderTRR?: ResponsiveValue<number>;
    borderBRR?: ResponsiveValue<number>;
    borderBLR?: ResponsiveValue<number>;
}

export interface RadiusPropsShort extends RadiusPropsLegacy {
    r?: ResponsiveValue<number>;
    tlr?: ResponsiveValue<number>;
    trr?: ResponsiveValue<number>;
    brr?: ResponsiveValue<number>;
    blr?: ResponsiveValue<number>;
}

export type RadiusInput = RadiusPropsShort;

export const resolveRadiusInput = (radius: RadiusInput): RadiusInput => ({
    r: radius.r,
    tlr: radius.tlr ?? radius.borderTLR,
    trr: radius.trr ?? radius.borderTRR,
    brr: radius.brr ?? radius.borderBRR,
    blr: radius.blr ?? radius.borderBLR,
});

/** Border props: each value becomes a utility class. */
export interface BorderStyleProps {
    border?: ResponsiveValue<string>;
    borderC?: ResponsiveValue<string>;
    borderS?: ResponsiveValue<string>;
    borderW?: ResponsiveValue<string | number>;
    borderT?: ResponsiveValue<string>;
    borderR?: ResponsiveValue<string>;
    borderB?: ResponsiveValue<string>;
    borderL?: ResponsiveValue<string>;
}

export type AspectRatioValue = Exclude<CSSProperties['aspectRatio'], undefined>;

export interface AspectRatioProps {
    aspectRatio?: ResponsiveValue<AspectRatioValue>;
}

export interface GrowProps {
    grow?: ResponsiveValue<number>;
}

export interface ShrinkProps {
    shrink?: ResponsiveValue<number>;
}

/** Положение коробки: числа смещения измеряются в дизайн-пикселях, строки — в CSS-единицах. */
export interface PositionProps {
    /** Способ позиционирования на каждой полосе ширины. */
    position?: ResponsiveValue<NonNullable<CSSProperties['position']>>;
    /** Смещение от верхнего края. */
    top?: ResponsiveValue<SpaceValue>;
    /** Смещение от нижнего края. */
    bottom?: ResponsiveValue<SpaceValue>;
    /** Смещение от левого края. */
    left?: ResponsiveValue<SpaceValue>;
    /** Смещение от правого края. */
    right?: ResponsiveValue<SpaceValue>;
}

export interface VisibilityProps {
    /** true скрывает коробку через display:none; false/null сохраняют её обычное отображение. */
    hide?: ResponsiveValue<boolean>;
}

// ── Class helpers ───────────────────────────────────────

export const layoutSpaceClasses = (c: ClassBuilder, s: LayoutSpaceProps): string[] => [
    ...c.value('p', s.p),
    ...c.value('pt', s.pt),
    ...c.value('pr', s.pr),
    ...c.value('pb', s.pb),
    ...c.value('pl', s.pl),
    ...c.value('m', s.m),
    ...c.value('mt', s.mt),
    ...c.value('mr', s.mr),
    ...c.value('mb', s.mb),
    ...c.value('ml', s.ml),
];

/** @deprecated Use layoutSpaceClasses. Kept as a compatibility alias while consumers migrate. */
export const numericSpaceClasses = layoutSpaceClasses;

export const sizeClasses = (c: ClassBuilder, s: SizeInput): string[] => [
    ...c.value('w', s.w),
    ...c.value('minW', s.minW),
    ...c.value('maxW', s.maxW),
    ...c.value('h', s.h),
    ...c.value('minH', s.minH),
    ...c.value('maxH', s.maxH),
];

export const radiusClasses = (c: ClassBuilder, r: RadiusInput): string[] => {
    const radius = resolveRadiusInput(r);
    return [
        ...c.value('r', radius.r),
        ...c.value('tlr', radius.tlr),
        ...c.value('trr', radius.trr),
        ...c.value('brr', radius.brr),
        ...c.value('blr', radius.blr),
    ];
};

export const borderClasses = (c: ClassBuilder, b: BorderStyleProps): string[] => [
    ...c.value('borderW', b.borderW),
    ...c.value('borderS', b.borderS),
    ...c.value('borderC', b.borderC),
    ...c.value('border', b.border),
    ...c.value('borderT', b.borderT),
    ...c.value('borderR', b.borderR),
    ...c.value('borderB', b.borderB),
    ...c.value('borderL', b.borderL),
];

/** Shared typography for every native visual host. */
export interface TypographyProps {
    fontSize?: ResponsiveValue<number | string>;
    fontWeight?: ResponsiveValue<number>;
    lineHeight?: ResponsiveValue<'normal' | number>;
    fontFamily?: ResponsiveValue<FontName | 'inherit'>;
    letterSpacing?: ResponsiveValue<number | string>;
    textTransform?: ResponsiveValue<string>;
    textAlign?: ResponsiveValue<'left' | 'right' | 'center' | 'justify' | 'start' | 'end'>;
    whiteSpace?: ResponsiveValue<
        'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces'
    >;
}

/** Native presentation handled by the preset runtime without generated utilities. */
export interface VisualProps {
    opacity?: number | ResponsiveValue<number>;
    cursor?: CSSProperties['cursor'] | ResponsiveValue<NonNullable<CSSProperties['cursor']>>;
    overflow?: CSSProperties['overflow'] | ResponsiveValue<NonNullable<CSSProperties['overflow']>>;
    overflowX?:
        | CSSProperties['overflowX']
        | ResponsiveValue<NonNullable<CSSProperties['overflowX']>>;
    overflowY?:
        | CSSProperties['overflowY']
        | ResponsiveValue<NonNullable<CSSProperties['overflowY']>>;
    zIndex?: number | ResponsiveValue<number>;
    boxShadow?: string | ResponsiveValue<string>;
}

export const typographyClasses = (c: ClassBuilder, props: TypographyProps): string[] => [
    ...c.value('fontSize', props.fontSize),
    ...c.value('fontWeight', props.fontWeight),
    ...c.value('lineHeight', props.lineHeight),
    ...c.value('fontFamily', props.fontFamily),
    ...c.value('letterSpacing', props.letterSpacing),
    ...c.value('textTransform', props.textTransform),
    ...c.value('textAlign', props.textAlign),
    ...c.value('whiteSpace', props.whiteSpace),
];
