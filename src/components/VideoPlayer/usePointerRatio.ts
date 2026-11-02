'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import { clamp01 } from '../../core/utils';

interface UsePointerRatioOptions {
    /** x: left to right; y: bottom to top. */
    orientation?: 'x' | 'y';
    onChange: (ratio: number) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onHover?: (ratio: number) => void;
    onLeave?: () => void;
}

/** Converts pointer coordinates into a bounded fraction; empty tracks cannot produce NaN. */
export function pointerRatio(position: number, start: number, size: number, reversed = false): number {
    if (!(size > 0)) return 0;
    const fraction = clamp01((position - start) / size);
    return reversed ? 1 - fraction : fraction;
}

/** One captured pointer owns the drag until release, cancellation or lost capture. */
export function usePointerRatio({ orientation = 'x', onChange, onStart, onEnd, onHover, onLeave }: UsePointerRatioOptions) {
    const isDragging = useRef(false);
    const pointer = useRef<number | null>(null);
    const capture = useRef<HTMLElement | null>(null);

    function ratio(event: PointerEvent<HTMLElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        return orientation === 'y'
            ? pointerRatio(event.clientY, rect.top, rect.height, true)
            : pointerRatio(event.clientX, rect.left, rect.width);
    }

    function finish() {
        if (!isDragging.current) return;
        isDragging.current = false;
        const id = pointer.current;
        const node = capture.current;
        pointer.current = null;
        capture.current = null;
        if (id !== null && node?.hasPointerCapture?.(id)) node.releasePointerCapture(id);
        onEnd?.();
    }

    useEffect(() => () => {
        const id = pointer.current;
        const node = capture.current;
        isDragging.current = false;
        pointer.current = null;
        capture.current = null;
        if (id !== null && node?.hasPointerCapture?.(id)) node.releasePointerCapture(id);
    }, []);

    return {
        isDragging,
        bind: {
            onPointerDown(event: PointerEvent<HTMLElement>) {
                if (event.button !== 0 || pointer.current !== null) return;
                pointer.current = event.pointerId;
                capture.current = event.currentTarget;
                isDragging.current = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                onStart?.();
                onChange(ratio(event));
            },
            onPointerMove(event: PointerEvent<HTMLElement>) {
                if (pointer.current !== null && pointer.current !== event.pointerId) return;
                const value = ratio(event);
                onHover?.(value);
                if (isDragging.current) onChange(value);
            },
            onPointerUp(event: PointerEvent<HTMLElement>) {
                if (event.pointerId === pointer.current) finish();
            },
            onPointerCancel(event: PointerEvent<HTMLElement>) {
                if (event.pointerId !== pointer.current) return;
                finish();
                onLeave?.();
            },
            onLostPointerCapture(event: PointerEvent<HTMLElement>) {
                if (event.target === event.currentTarget && event.pointerId === pointer.current) finish();
            },
            onPointerLeave() {
                if (!isDragging.current) onLeave?.();
            },
        },
    };
}
