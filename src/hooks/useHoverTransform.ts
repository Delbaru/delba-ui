'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import { hoverMotionSource, type HoverTransformOptions } from '../core/base/hover-motion';

/** Only interaction state is imperative. CSS owns interpolation, interruption and reduced motion. */
export function useHoverTransform(options: HoverTransformOptions | undefined) {
    const nodeRef = useRef<HTMLElement | SVGElement | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const cleanupRef = useRef<(() => void) | undefined>(undefined);

    const connect = useCallback(() => {
        cleanupRef.current?.();
        cleanupRef.current = undefined;
        const node = nodeRef.current;
        const config = optionsRef.current;
        if (!node || !config) return;
        const source = hoverMotionSource(node, config.source);
        if (!source) return;
        let hovered = source.matches(':hover') && source.ownerDocument.defaultView?.matchMedia('(hover: hover)').matches === true;
        let focused = source.contains(source.ownerDocument.activeElement);
        const sync = () => {
            const disabled = source.matches(':disabled, [aria-disabled="true"]') || source.closest('[inert]') !== null;
            node.toggleAttribute('data-hover-active', !disabled && (hovered || focused));
        };
        const enter = (event: Event) => {
            if ('pointerType' in event && event.pointerType === 'touch') return;
            hovered = true;
            sync();
        };
        const leave = () => { hovered = false; sync(); };
        const focusIn = () => { focused = true; sync(); };
        const focusOut = (event: Event) => {
            focused = event instanceof FocusEvent && event.relatedTarget instanceof Node && source.contains(event.relatedTarget);
            sync();
        };
        source.addEventListener('pointerenter', enter);
        source.addEventListener('pointerleave', leave);
        source.addEventListener('focusin', focusIn);
        source.addEventListener('focusout', focusOut);
        sync();
        cleanupRef.current = () => {
            source.removeEventListener('pointerenter', enter);
            source.removeEventListener('pointerleave', leave);
            source.removeEventListener('focusin', focusIn);
            source.removeEventListener('focusout', focusOut);
            node.removeAttribute('data-hover-active');
        };
    }, []);

    const setHoverNode = useCallback((node: HTMLElement | SVGElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = undefined;
        nodeRef.current = node;
        connect();
    }, [connect]);

    useLayoutEffect(() => {
        connect();
        return () => cleanupRef.current?.();
    }, [connect, options?.source, Boolean(options)]);

    return setHoverNode;
}
