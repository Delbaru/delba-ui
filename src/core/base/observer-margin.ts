/** Explicit sides follow IntersectionObserver semantics: percentages are relative to viewport width. */
export type ObserverMarginValue = `${number}px` | `${number}%`;
export interface ObserverMargins {
    top: ObserverMarginValue;
    right: ObserverMarginValue;
    bottom: ObserverMarginValue;
    left: ObserverMarginValue;
}
/** Legacy strings remain readable; new configs should name all four sides. */
export type ObserverMargin = ObserverMargins | string;
export const ZERO_OBSERVER_MARGIN: ObserverMargins = {
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
};
const SIDE = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)$/;

export function normalizeObserverMargin(value: unknown): string | null {
    if (typeof value === 'string') {
        const sides = value.trim().split(/\s+/);
        if (sides.length < 1 || sides.length > 4 || !sides.every((side) => SIDE.test(side)))
            return null;
        // Preserve legacy strings and their exact percentage semantics.
        return sides.join(' ');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const keys = ['top', 'right', 'bottom', 'left'];
    if (
        Object.keys(record).length !== 4 ||
        !keys.every((key) => typeof record[key] === 'string' && SIDE.test(record[key]))
    )
        return null;
    return keys.map((key) => record[key]).join(' ');
}
