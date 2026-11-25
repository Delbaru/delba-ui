/** A source is scoped by its data owner, not by the UI. currentData is authoritative when present. */
export type AsyncSource<T> = {
    data?: T;
    currentData?: T;
    isLoading?: boolean;
    isFetching?: boolean;
    loading?: boolean;
    refreshing?: boolean;
    /** Explicit empty result, including successful undefined data. */
    empty?: boolean;
    refetch?: () => unknown;
    error?: unknown;
};

export function isAsyncEmpty(data: unknown): boolean {
    if (Array.isArray(data)) return data.length === 0;
    if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
        return data.items.length === 0;
    }
    return data === null || data === undefined;
}

export function asyncSourceState<T>(from: AsyncSource<T>) {
    const data = 'currentData' in from ? from.currentData : from.data;
    const hasError = from.error !== undefined && from.error !== null;
    const pending = data === undefined && Boolean((from.loading ?? from.isLoading) || (!hasError && from.empty !== true));
    const networkFailure = Boolean(hasError && typeof from.error === 'object' &&
        'status' in from.error && from.error.status === 0);
    const keepCurrent = networkFailure && data !== undefined;
    return { data, pending, keepCurrent, empty: !pending && (from.empty ?? isAsyncEmpty(data)),
        refreshing: Boolean(from.refreshing ?? from.isFetching) && data !== undefined };
}
