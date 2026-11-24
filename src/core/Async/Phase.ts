export type AsyncPhase = 'idle' | 'waiting' | 'visible' | 'leaving';

/** Retain only the loading placeholder during exit, never the previous query's data. */
export function syncAsyncPhase(phase: AsyncPhase, pending: boolean, reduced: boolean): AsyncPhase {
    if (reduced) return pending ? 'visible' : 'idle';
    if (pending) return phase === 'idle' ? 'waiting' : phase === 'leaving' ? 'visible' : phase;
    return phase === 'waiting' ? 'idle' : phase === 'visible' ? 'leaving' : phase;
}
export function completeAsyncPhase(phase: AsyncPhase): AsyncPhase {
    return phase === 'waiting' ? 'visible' : phase === 'leaving' ? 'idle' : phase;
}
