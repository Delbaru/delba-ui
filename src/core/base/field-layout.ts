import type { ClassBuilder } from '../layout/layout-classes';
import { boxLayout, type BoxLayoutProps } from '../layout/box';
import type { ResponsiveSpaceValue, SpaceValue } from '../layout/space';
import { resolveResponsive, type ResponsiveInput } from './responsive';

/**
 * Объединённый интерфейс layout-пропсов для field-компонентов
 * (Input, Textarea, Select и аналогичных).
 */
export interface FieldLayoutProps extends BoxLayoutProps {
    variant?: ResponsiveInput<string>;
    size?: ResponsiveInput<string>;
    color?: string;
    placeholderColor?: string;
}

/** Общие умолчания полей: явная геометрия отменяет размер-пресет, явный size сохраняется. */
export function resolveFieldLayout(props: FieldLayoutProps): FieldLayoutProps {
    const hasExplicitSize = props.w !== undefined || props.minW !== undefined || props.maxW !== undefined
        || props.h !== undefined || props.minH !== undefined || props.maxH !== undefined;
    return {
        ...props,
        variant: props.variant ?? 'primary',
        size: props.size ?? (hasExplicitSize ? undefined : 'default'),
    };
}

/** Классы поля за один вызов: вариант и размер — из модуля поля, остальное — утилиты. */
export function fieldLayoutClasses(c: ClassBuilder, props: FieldLayoutProps): string[] {
    return [
        ...c.value('variant', props.variant),
        ...c.value('size', props.size),
        ...boxLayout(c, { ...props, grow: undefined, position: undefined, top: undefined, bottom: undefined, left: undefined, right: undefined, hide: undefined }),
        ...c.value('color', props.color),
        ...c.value('placeholderColor', props.placeholderColor),
    ];
}

/** Положение и видимость относятся ко всему полю, включая подпись и подсказки. */
export const fieldRootLayoutClasses = (c: ClassBuilder, props: BoxLayoutProps): string[] =>
    boxLayout(c, { grow: props.grow, position: props.position, top: props.top, bottom: props.bottom, left: props.left, right: props.right, hide: props.hide });

const isSpaceToken = (value: unknown): value is number | string =>
    typeof value === 'number' || typeof value === 'string';

const extractLeftFromEntry = (entry: unknown): number | string | null | undefined => {
    if (entry === null || entry === undefined) return entry;
    if (isSpaceToken(entry)) return entry;
    if (Array.isArray(entry) && entry.length === 4 && entry.every(isSpaceToken)) {
        return entry[3] as number | string;
    }
    return undefined;
};

/**
 * Возвращает `padding-left` для helper-текста (error/comment)
 * на основе `p`/`pl` пропсов field-компонента.
 *
 * Поддерживает:
 * - число / строку
 * - shorthand-массив `[top, right, bottom, left]`
 * - responsive-массив `[desktop, mobile, tablet]`, где каждый breakpoint
 *   может быть числом, строкой или shorthand-массивом.
 */
export function fieldHelperPaddingLeft(
    p: ResponsiveSpaceValue | undefined,
    pl: ResponsiveInput<SpaceValue> | undefined
): [SpaceValue | null, SpaceValue | null, SpaceValue | null] | undefined {
    if (pl !== undefined) return resolveResponsive(pl);
    if (p === undefined) return undefined;
    if (!Array.isArray(p)) return [p, p, p];

    // shorthand [top, right, bottom, left]
    if (p.length === 4 && p.every(isSpaceToken)) {
        const left = p[3] as SpaceValue;
        return [left, left, left];
    }

    // responsive array [desktop, mobile, tablet]
    const [d0, m0, t0] = p as [unknown, unknown, unknown];
    const d = extractLeftFromEntry(d0) ?? null;
    const mRaw = extractLeftFromEntry(m0);
    const tRaw = extractLeftFromEntry(t0);
    const m = mRaw === undefined ? d : (mRaw ?? null);
    const t = tRaw === undefined ? d : (tRaw ?? null);

    if (d === null && m === null && t === null) return undefined;
    return [d, m, t];
}
