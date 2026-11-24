'use client';

import type { ReactNode } from 'react';
import { asyncSourceState, type AsyncSource } from './State';
import { useAsyncPresence } from './Presence';

export interface AsyncOptions {
    preset: 'default';
    from: AsyncSource<unknown>;
    loading?: ReactNode;
    empty?: ReactNode;
    error?: ReactNode | ((error: unknown, retry?: () => unknown) => ReactNode);
    timing?: { delay?: number; hide?: number };
}

function useAsyncState<T>(from: AsyncSource<T>, timing: AsyncOptions['timing'], enabled: boolean) {
    const state = asyncSourceState(from);
    const phase = useAsyncPresence(state.pending, timing, enabled);
    return { ...state, phase, error: from.error, retry: from.refetch };
}

export function useAsync<T>(from: AsyncSource<T>, timing?: AsyncOptions['timing']) {
    return useAsyncState(from, timing, true);
}

/** Preserve the host element; only its children reflect the source state. */
export function useAsyncContent(options: AsyncOptions | undefined, children: ReactNode) {
    const state = useAsyncState(options?.from ?? { data: true }, options?.timing, Boolean(options));
    if (!options) return { children, busy: undefined };
    const failure = state.error ? (
        <span role="alert">{typeof options.error === 'function'
            ? options.error(state.error, state.retry) : options.error ?? 'Не удалось загрузить.'}</span>
    ) : null;
    if (failure && !state.keepCurrent) return { children: failure, busy: false };
    if (state.phase !== 'idle') {
        return { children: options.loading ?? <span role="status">Загрузка…</span>, busy: true };
    }
    return { children: <>{failure}{state.empty && options.empty !== undefined ? options.empty : children}</>,
        busy: state.refreshing };
}
