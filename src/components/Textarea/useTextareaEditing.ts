import { useCallback, useLayoutEffect } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import type { TextareaProps } from './Textarea.types';

/** Shared native editing; list syntax belongs to the caller. */
export function useTextareaEditing(
    target: RefObject<HTMLTextAreaElement | null>,
    options: Pick<
        TextareaProps,
        'autoGrow' | 'autoContinue' | 'rows' | 'disabled' | 'readOnly' | 'loading'
    >,
    value: string,
) {
    const measure = useCallback(() => {
        const element = target.current;
        const view = element?.ownerDocument.defaultView;
        if (!options.autoGrow || !element || !view) return;
        element.style.height = 'auto';
        element.style.height = `${Math.min(element.scrollHeight, view.innerHeight * 0.4)}px`;
    }, [options.autoGrow, target]);

    useLayoutEffect(() => {
        const element = target.current;
        const view = element?.ownerDocument.defaultView;
        if (!options.autoGrow || !element || !view) return;
        const previousHeight = element.style.height;
        measure();
        view.addEventListener('resize', measure);
        return () => {
            view.removeEventListener('resize', measure);
            element.style.height = previousHeight;
        };
    }, [measure, options.autoGrow, options.rows, options.loading, target, value]);

    function continueLine(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (
            !options.autoContinue ||
            options.disabled ||
            options.readOnly ||
            event.defaultPrevented ||
            event.nativeEvent.isComposing ||
            event.key !== 'Enter' ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        const element = event.currentTarget;
        const next = options.autoContinue(
            element.value,
            element.selectionStart ?? element.value.length,
        );
        if (!next) return;
        const view = element.ownerDocument.defaultView;
        if (!view) return;
        const setter = Object.getOwnPropertyDescriptor(
            view.HTMLTextAreaElement.prototype,
            'value',
        )?.set;
        if (!setter) return;
        event.preventDefault();
        setter.call(element, next.value);
        element.dispatchEvent(new view.Event('input', { bubbles: true }));
        element.setSelectionRange(next.caret, next.caret);
        measure();
    }

    return { measure, continueLine };
}
