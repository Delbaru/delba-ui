'use client';

import { useCallback, useState } from 'react';

/** Aggregates editor activity for a consumer-owned leave/unsaved guard. */
export function useEditActivity(scope: string) {
    const [state, setState] = useState({ scope, keys: new Set<string>() });
    const track = useCallback(
        (key: string, active: boolean) => {
            setState((previous) => {
                const keys = previous.scope === scope ? previous.keys : new Set<string>();
                if (keys.has(key) === active && previous.scope === scope) return previous;
                const next = new Set(keys);
                if (active) next.add(key);
                else next.delete(key);
                return { scope, keys: next };
            });
        },
        [scope],
    );
    return { active: state.scope === scope && state.keys.size > 0, track };
}
