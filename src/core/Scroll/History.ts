/** Keep the same item at the same viewport-relative offset after a prepend.
 * Native scroll anchoring may already have compensated: then delta is zero.
 */
export function historyScrollTop(
    scrollTop: number, previousOffset: number, currentOffset: number, scrollHeight: number, clientHeight: number,
): number {
    const max = Math.max(0, scrollHeight - clientHeight);
    return Math.min(max, Math.max(0, scrollTop + currentOffset - previousOffset));
}

/** Center an anchor in its own viewport, never an outer page or dialog. */
export function centeredScrollTop(scrollTop: number, offset: number, itemHeight: number, scrollHeight: number, clientHeight: number): number {
    return historyScrollTop(scrollTop, (clientHeight - itemHeight) / 2, offset, scrollHeight, clientHeight);
}
