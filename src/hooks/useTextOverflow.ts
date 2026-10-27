'use client';

import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type MutableRefObject,
    type RefCallback,
} from 'react';

export interface UseTextOverflowResult<E extends HTMLElement = HTMLElement> {
    /** Ref на элемент, чьё переполнение по горизонтали отслеживаем (input / текстовый узел). Writable — можно мёржить. */
    ref: MutableRefObject<E | null>;
    /** Stable callback for conditionally mounted targets; retains the object ref for existing callers. */
    setNode: RefCallback<E>;
    /** true, когда контент не влезает и обрезается (`text-overflow: ellipsis`). */
    isOverflowing: boolean;
    /** Полный текст элемента (value для полей ввода, иначе textContent) — для показа в тултипе. */
    text: string;
}

// Допуск против субпиксельных округлений scrollWidth/clientWidth.
const OVERFLOW_TOLERANCE = 1;

function readText(el: HTMLElement): string {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return el.value;
    }

    return el.textContent ?? '';
}

/**
 * Определяет, обрезается ли текст элемента по ширине, и отдаёт его полный текст.
 * Перемеряет после каждого рендера (значение/типографика могли поменяться) и при ресайзе контейнера.
 */
export function useTextOverflow<E extends HTMLElement = HTMLElement>(): UseTextOverflowResult<E> {
    const ref = useRef<E | null>(null);
    const observed = useRef<E | null>(null);
    const observer = useRef<ResizeObserver | null>(null);
    const [state, setState] = useState<{ isOverflowing: boolean; text: string }>({
        isOverflowing: false,
        text: '',
    });

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;

        const isOverflowing = el.scrollWidth - el.clientWidth > OVERFLOW_TOLERANCE;
        const text = readText(el);

        setState((prev) =>
            prev.isOverflowing === isOverflowing && prev.text === text
                ? prev
                : { isOverflowing, text },
        );
    }, []);

    const connect = useCallback(() => {
        const el = ref.current;
        if (observed.current === el) return;
        observer.current?.disconnect();
        observed.current = el;
        observer.current =
            el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        if (el) observer.current?.observe(el);
    }, [measure]);

    const setNode = useCallback(
        (node: E | null) => {
            ref.current = node;
            connect();
            measure();
        },
        [connect, measure],
    );

    useLayoutEffect(() => {
        connect();
        measure();
    });
    useLayoutEffect(
        () => () => {
            observer.current?.disconnect();
            observer.current = null;
            observed.current = null;
        },
        [],
    );

    return { ref, setNode, isOverflowing: state.isOverflowing, text: state.text };
}
