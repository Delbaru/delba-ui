'use client';
import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { historyScrollTop } from './History';

/** Follow content growth without moving a reader who explicitly left the end. */
export function useFeedScroll(input: {
    scope: string;
    enabled: boolean;
    anchorId?: string | null;
    /** Attribute supplied by the content owner; no knowledge of message IDs. */
    itemAttribute: `data-${string}`;
    viewport: RefObject<HTMLDivElement | null>;
    content: RefObject<HTMLDivElement | null>;
}) {
    const itemAttribute = input.itemAttribute;
    if (!/^data-[a-z0-9-]+$/.test(itemAttribute)) throw new Error('Invalid feed item attribute');
    const selector = `[${itemAttribute}]`;
    const history = useRef<(() => (() => boolean) | null) | null>(null);
    const captureHistoryAnchor = useCallback(() => history.current?.() ?? null, []);
    const following = useRef(true),
        anchored = useRef(false),
        [showBottom, setShowBottom] = useState(false);
    const latest = useCallback(() => {
        following.current = true;
        anchored.current = false;
        const node = input.viewport.current;
        if (node) node.scrollTop = node.scrollHeight;
        setShowBottom(false);
    }, [input.viewport]);
    // An external attention change releases the anchor without scrolling.
    const releaseAnchor = useCallback(() => {
        if (!anchored.current) return;
        anchored.current = false;
        const node = input.viewport.current;
        if (!node) return;
        const away = node.scrollHeight - node.scrollTop - node.clientHeight > 100;
        following.current = !away;
        setShowBottom(away);
    }, [input.viewport]);
    useLayoutEffect(() => {
        const viewport = input.viewport.current,
            content = input.content.current;
        following.current = !input.anchorId;
        setShowBottom(false);
        if (!input.enabled || !viewport || !content) return;
        let active = true, gesture = 0, capture = 0;
        let initialized = false,
            frame = 0,
            manual = false;
        anchored.current = Boolean(input.anchorId);
        // This is the existing near-bottom affordance, not permission for a resize to scroll.
        const away = () => viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 100;
        history.current = () => {
            if (!initialized || following.current || anchored.current) return null;
            const bounds = viewport.getBoundingClientRect();
            const target = Array.from(content.querySelectorAll<HTMLElement>(selector)).find(node => {
                const rect = node.getBoundingClientRect();
                return rect.bottom > bounds.top && rect.top < bounds.bottom && node.hasAttribute(itemAttribute);
            });
            if (!target) return null;
            const id = target.getAttribute(itemAttribute);
            const offset = target.getBoundingClientRect().top - bounds.top;
            const capturedGesture = gesture;
            const captured = ++capture;
            let used = false;
            return () => {
                if (used || !active || gesture !== capturedGesture || capture !== captured ||
                    following.current || anchored.current || input.viewport.current !== viewport ||
                    input.content.current !== content || !viewport.isConnected) return false;
                used = true;
                const current = Array.from(content.querySelectorAll<HTMLElement>(selector))
                    .find(node => node.getAttribute(itemAttribute) === id);
                if (!current) return false;
                const currentOffset = current.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
                manual = false;
                viewport.scrollTop = historyScrollTop(viewport.scrollTop, offset, currentOffset, viewport.scrollHeight, viewport.clientHeight);
                setShowBottom(away());
                return true;
            };
        };
        const reconcile = () => {
            frame = 0;
            if (!content.querySelector(selector)) return;
            if (anchored.current) {
                const target = Array.from(
                    content.querySelectorAll<HTMLElement>(selector),
                ).find((node) => node.getAttribute(itemAttribute) === input.anchorId);
                if (!target) return;
                target.scrollIntoView({ block: 'center' });
                initialized = true;
            } else if (!initialized || following.current) {
                viewport.scrollTop = viewport.scrollHeight;
                initialized = true;
            }
            setShowBottom(away());
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(reconcile);
        };
        const scroll = () => {
            if (!initialized) return;
            // Native layout, scroll anchoring and our own positioning also emit scroll.
            // Only a reader gesture may change the follow latch.
            if (manual) following.current = !away();
            setShowBottom(away());
        };
        const interact = () => {
            gesture++;
            anchored.current = false;
            following.current = false;
            manual = true;
        };
        const keydown = (event: KeyboardEvent) => {
            if (
                ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(
                    event.key,
                )
            )
                interact();
        };
        viewport.addEventListener('scroll', scroll, { passive: true });
        viewport.addEventListener('wheel', interact, { passive: true });
        viewport.addEventListener('pointerdown', interact, { passive: true });
        viewport.addEventListener('keydown', keydown);
        // Content images and delayed loading placeholders can reposition a retained anchor.
        // A shorter viewport caused by adjacent controls is deliberately observation-only.
        const resize = new ResizeObserver((entries) => {
            if (entries.some((entry) => entry.target === content)) {
                manual = false;
                schedule();
            } else setShowBottom(away());
        });
        resize.observe(viewport);
        resize.observe(content);
        const mutation = new MutationObserver(() => {
            manual = false;
            schedule();
        });
        mutation.observe(content, { childList: true, subtree: true, characterData: true });
        schedule();
        return () => {
            active = false;
            history.current = null;
            if (frame) cancelAnimationFrame(frame);
            resize.disconnect();
            mutation.disconnect();
            viewport.removeEventListener('scroll', scroll);
            viewport.removeEventListener('wheel', interact);
            viewport.removeEventListener('pointerdown', interact);
            viewport.removeEventListener('keydown', keydown);
        };
    }, [input.scope, input.enabled, input.anchorId, input.viewport, input.content, itemAttribute, selector]);
    return { showBottom, latest, releaseAnchor, captureHistoryAnchor };
}
