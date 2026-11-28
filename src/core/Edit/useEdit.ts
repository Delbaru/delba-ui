'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EditSession } from './EditSession';
import type { EditController, EditElement, EditOptions } from './Edit.types';

export function useEdit(options: EditOptions): EditController {
    const [session] = useState(() => new EditSession(options));
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    const element = useRef<EditElement | null>(null);
    const frame = useRef<number | null>(null);

    useLayoutEffect(() => {
        session.sync(options);
    });
    useLayoutEffect(
        () => () => {
            session.dispose();
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        },
        [session],
    );

    useLayoutEffect(() => {
        if (!state.editing || state.pending) return;
        const node = element.current;
        node?.focus();
        const caret = node?.value.length ?? 0;
        node?.setSelectionRange(caret, caret);
    }, [state.editing, state.pending, options.scope]);

    useLayoutEffect(() => {
        const node = element.current;
        if (node?.tagName !== 'TEXTAREA') return;
        node.style.height = 'auto';
        node.style.height = `${node.scrollHeight}px`;
    }, [state.value, state.editing, options.scope]);

    const activityCallback = useRef(options.onActivityChange);
    activityCallback.current = options.onActivityChange;
    const active = state.editing || state.pending || state.dirty;
    useEffect(() => {
        activityCallback.current?.(active);
    }, [active, options.scope]);
    useEffect(() => {
        const callback = options.onActivityChange;
        return () => {
            callback?.(false);
        };
    }, [options.scope]);

    return {
        ...state,
        start: session.start,
        cancel: session.cancel,
        commit: session.commit,
        change: session.change,
        inputProps: {
            ref: (node) => {
                element.current = node;
            },
            value: state.value,
            readOnly: state.pending || options.canEdit === false,
            'aria-busy': state.pending,
            'aria-invalid': state.hasError,
            onChange: (event) => session.change(event.target.value),
            onBlur: () => {
                void session.commit();
            },
            onKeyDown: (event) => {
                if (event.defaultPrevented || event.nativeEvent.isComposing) return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    session.cancel();
                } else if (event.key === 'Enter' && !options.multiline) {
                    event.preventDefault();
                    void session.commit();
                } else if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    options.autoContinue &&
                    !state.pending
                ) {
                    const node = event.currentTarget;
                    const next = options.autoContinue(
                        node.value,
                        node.selectionStart ?? node.value.length,
                    );
                    if (!next) return;
                    event.preventDefault();
                    session.change(next.value);
                    if (frame.current !== null) cancelAnimationFrame(frame.current);
                    frame.current = requestAnimationFrame(() => {
                        if (element.current === node)
                            node.setSelectionRange(next.caret, next.caret);
                        frame.current = null;
                    });
                }
            },
        },
    };
}
