'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** Native reset also owns custom controls associated through form=; cancellation is observed after dispatch. */
export function useFormReset<E extends HTMLElement>(
    ref: RefObject<E | null>,
    formId: string | undefined,
    onReset: () => void,
) {
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    useEffect(
        () => () => {
            timers.current.forEach(clearTimeout);
            timers.current.clear();
        },
        [],
    );
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const ownerDocument = node.ownerDocument;
        const view = ownerDocument.defaultView;
        if (!view) return;
        const owner = () =>
            node instanceof view.HTMLInputElement || node instanceof view.HTMLTextAreaElement
                ? node.form
                : formId !== undefined
                  ? ownerDocument.getElementById(formId)
                  : node.closest('form');
        const form = owner();
        if (!(form instanceof view.HTMLFormElement)) return;
        // A microtask may run between native listeners and React's delegated onReset.
        // The next task observes cancellation after the complete event dispatch.
        const reset = (event: Event) => {
            const timer = setTimeout(() => {
                timers.current.delete(timer);
                if (
                    !event.defaultPrevented &&
                    ref.current === node &&
                    node.isConnected &&
                    owner() === form
                )
                    onReset();
            }, 0);
            timers.current.add(timer);
        };
        form.addEventListener('reset', reset);
        return () => form.removeEventListener('reset', reset);
    });
}
