'use client';

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { bindDurationWheel, DurationSession } from './DurationSession';
import type {
    DurationController,
    DurationInputProps,
    DurationOptions,
    DurationUnit,
} from './Duration.types';

export function useDuration(options: DurationOptions): DurationController {
    const [session] = useState(() => new DurationSession(options));
    const draft = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    const wheelCleanup = useRef<(() => void) | undefined>(undefined);

    useLayoutEffect(() => {
        session.sync(options);
    });

    // Callback refs detach immediately when a conditional editor disappears or is replaced.
    const rootRef = useCallback(
        (node: HTMLElement | null) => {
            wheelCleanup.current?.();
            wheelCleanup.current = node ? bindDurationWheel(node, session) : undefined;
        },
        [session],
    );

    function inputProps(unit: DurationUnit): DurationInputProps {
        const step = unit === 'hours' ? 60 : 1;
        return {
            value: draft[unit],
            'data-duration-unit': step === 60 ? '60' : '1',
            inputMode: 'numeric',
            disabled: options.disabled,
            onFocus: (event) => event.currentTarget.select(),
            onChange: (event) => session.change(unit, event.currentTarget.value),
            onBlur: session.commit,
            onKeyDown: (event) => session.key(step, event),
        };
    }

    return {
        hoursProps: inputProps('hours'),
        minutesProps: inputProps('minutes'),
        rootRef,
        commit: session.commit,
        cancel: session.cancel,
        clamp: session.clamp,
    };
}
