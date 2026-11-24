/** Keep the same item at the same viewport-relative offset after a prepend.
 * Native scroll anchoring may already have compensated: then delta is zero.
 */
export function historyScrollTop(
    scrollTop: number, previousOffset: number, currentOffset: number, scrollHeight: number, clientHeight: number,
): number {
    const max = Math.max(0, scrollHeight - clientHeight);
    return Math.min(max, Math.max(0, scrollTop + currentOffset - previousOffset));
}
