'use client';

import { resolvePresetProps } from '../../../core/Preset';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type PointerEvent,
    type KeyboardEvent,
    type MouseEvent,
    type RefObject,
} from 'react';
import {
    boxLayout,
    createLayoutClasses,
    cx,
    MOTION_END_BUFFER_MS,
    prefersReducedMotion,
    readMotionMs,
    type WithRef,
} from '#core';
import { beginPointerGesture } from '../../../core/base/pointer-gesture';
import { isOpenAnimate } from '../../../core/reveal/reveal';
import { useModalRuntime } from '../ModalProvider';
import { scrollbarProps } from '../../ScrollArea/scrollbar';
import { MODAL_DEFAULTS } from '../Modal.config';
import type { ModalSurfaceProps } from '../Modal.types';
import styles from './ModalSurface.module.scss';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const focusOrigins = new WeakMap<HTMLElement, HTMLElement[]>();
function focusStops(scope: Element): HTMLElement[] {
    return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) =>
            node.tabIndex >= 0 &&
            node.getClientRects().length > 0 &&
            node.ownerDocument.defaultView?.getComputedStyle(node).visibility !== 'hidden' &&
            !node.closest('[hidden], [inert], [aria-hidden="true"]'),
    );
}

function restoreOrigin(candidates: HTMLElement[]) {
    const target = candidates.find(
        (node) => node.isConnected && !node.closest('[hidden], [inert], [aria-hidden="true"]'),
    );
    modalFocus.restore(target ?? null);
}

const modalFocus = {
    dialogs(document: Document) {
        return [
            ...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
        ].filter((dialog) => !dialog.closest('[aria-hidden="true"], [inert]'));
    },
    restore(target: HTMLElement | null) {
        if (!target?.isConnected || target.closest('[hidden], [inert], [aria-hidden="true"]'))
            return;
        const active = modalFocus.dialogs(target.ownerDocument);
        const dialog = target.closest<HTMLElement>('[role="dialog"][aria-modal="true"]');
        if (dialog ? active.at(-1) === dialog : active.length === 0)
            target.focus({ preventScroll: true });
    },
    trap(
        event: globalThis.KeyboardEvent,
        panel: HTMLElement,
        escape: boolean,
        close: () => void,
        ignoreWithin?: string,
    ) {
        if (
            event.defaultPrevented ||
            !['Tab', 'Escape'].includes(event.key) ||
            panel.closest('[aria-hidden="true"]')
        )
            return;
        if (modalFocus.dialogs(panel.ownerDocument).at(-1) !== panel) return;
        const fullscreen = panel.ownerDocument.fullscreenElement;
        const scope = fullscreen && panel.contains(fullscreen) ? fullscreen : panel;
        const current = panel.ownerDocument.activeElement;
        if (ignoreWithin && current instanceof Element && current.closest(ignoreWithin)) return;
        if (event.key === 'Escape') {
            if (fullscreen) return;
            if (escape && !event.defaultPrevented) {
                event.preventDefault();
                close();
            }
            return;
        }
        const stops = focusStops(scope);
        const first = stops[0];
        const last = stops.at(-1);
        const withinStops = stops.some((node) => node === current);
        const atBoundary = event.shiftKey ? current === first : current === last;
        if (!first || !last || !withinStops || atBoundary) {
            event.preventDefault();
            (event.shiftKey ? (last ?? panel) : (first ?? panel)).focus();
        }
    },
};

interface ModalSurfaceState {
    panel: RefObject<HTMLElement | null>;
    open: boolean;
    active: boolean;
    closing: boolean;
    escape: boolean;
    ignoreWithin?: string;
    close(): void;
    exitAfter(duration: number): void;
}

/** Owns dialog focus, confirmed-close restoration, and the visible transition lifecycle. */
function useDialogLifecycle({
    panel,
    open,
    active,
    closing,
    escape,
    ignoreWithin,
    close,
    exitAfter,
}: ModalSurfaceState) {
    const origins = useRef<HTMLElement[]>([]);
    const captured = useRef(false);
    const activeRef = useRef(active);
    const closeRef = useRef(close);
    const exitRef = useRef(exitAfter);
    activeRef.current = active;
    closeRef.current = close;
    exitRef.current = exitAfter;

    useLayoutEffect(() => {
        const node = panel.current;
        const document = node?.ownerDocument;
        const view = document?.defaultView;
        if (!open || !active || !node || !document || !view) return;
        if (!captured.current) {
            const current = document.activeElement;
            const previous = current instanceof view.HTMLElement ? current : null;
            const parent = previous?.closest<HTMLElement>('[role="dialog"]');
            origins.current = previous
                ? [previous, ...(parent ? (focusOrigins.get(parent) ?? []) : [])]
                : [];
            focusOrigins.set(node, origins.current);
            captured.current = true;
        }
        if (!node.contains(document.activeElement))
            (focusStops(node)[0] ?? node).focus({ preventScroll: true });
        const trap = (event: globalThis.KeyboardEvent) =>
            modalFocus.trap(event, node, escape, () => closeRef.current(), ignoreWithin);
        document.addEventListener('keydown', trap);
        return () => document.removeEventListener('keydown', trap);
    }, [active, escape, ignoreWithin, open, panel]);

    useLayoutEffect(() => {
        if (open || !captured.current) return;
        restoreOrigin(origins.current);
        origins.current = [];
        captured.current = false;
    }, [open, active]);

    useEffect(
        () => () => {
            if (!activeRef.current || !captured.current) return;
            const candidates = origins.current;
            // Several stacked dialogs may be removed in one commit; wait for their DOM removal.
            queueMicrotask(() => restoreOrigin(candidates));
        },
        [],
    );

    useLayoutEffect(() => {
        const node = panel.current;
        const view = node?.ownerDocument.defaultView;
        if (!closing || !node || !view) return;
        const overlay = node.previousElementSibling;
        const duration = prefersReducedMotion()
            ? 0
            : Math.max(
                  readMotionMs(node),
                  readMotionMs(node, 'animation'),
                  overlay instanceof view.HTMLElement ? readMotionMs(overlay) : 0,
              );
        exitRef.current(duration + MOTION_END_BUFFER_MS);
    }, [closing, panel]);

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (event.key !== 'Escape' || event.defaultPrevented || !escape || !activeRef.current)
                return;
            const node = panel.current;
            if (node?.ownerDocument.fullscreenElement) return;
            if (
                ignoreWithin &&
                event.target instanceof Element &&
                event.target.closest(ignoreWithin)
            )
                return;
            event.preventDefault();
            closeRef.current();
        },
        [escape, ignoreWithin, panel],
    );

    return { onKeyDown };
}

const c = createLayoutClasses(styles);

export function useModalSurface(input: WithRef<ModalSurfaceProps, HTMLDivElement>) {
    const {
        ref,
        id,
        drag,
        children,
        controls,
        className = '',
        rootClassName,
        overlayClassName,
        style: panelStyle,
        rootStyle,
        overlayStyle,
        layout = MODAL_DEFAULTS.layout,
        state,
        closeOnOverlayClick = true,
        closeOn,
        scroll,
        overflowVisible = false,
        rootP,
        rootPt,
        rootPr,
        rootPb,
        rootPl,
        rootM,
        rootMt,
        rootMr,
        rootMb,
        rootMl,
        grow,
        perspective3d,
        parallax,
        animate,
        alignItems,
        justifyContent,
        color,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledby,
        'data-point-events': dataPointEvents,
        linkState,
        ...panelBox
    } = resolvePresetProps(input);
    const { open, active, closing, dismiss: onClose, exitAfter } = useModalRuntime();
    const closeOnEscape = closeOn?.escape ?? true;
    // Коробка делится на две: отступы root* и grow — у слоя-подложки, остальное — у панели диалога.
    const root = boxLayout(c, {
        p: rootP,
        pt: rootPt,
        pr: rootPr,
        pb: rootPb,
        pl: rootPl,
        m: rootM,
        mt: rootMt,
        mr: rootMr,
        mb: rootMb,
        ml: rootMl,
        grow,
    });
    const panel = boxLayout(c, panelBox);
    const panelRef = useRef<HTMLDivElement>(null);
    const overlayPressed = useRef(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const gesture = useRef<ReturnType<typeof beginPointerGesture>>(null);
    useEffect(() => {
        if (!open) {
            gesture.current?.cancel();
            setOffset({ x: 0, y: 0 });
        }
        return () => gesture.current?.cancel();
    }, [open]);
    const move = (event: PointerEvent<HTMLElement>) => {
        const node = panelRef.current;
        const target = event.target;
        if (!drag || !node || !active || !(target instanceof Element)) return;
        const handle = target.closest<HTMLElement>(drag.handle);
        if (!handle || !node.contains(handle)) return;
        if (target.closest('button,a,input,textarea,select,[contenteditable="true"]')) return;
        gesture.current?.cancel();
        const rect = node.getBoundingClientRect();
        const start = offset;
        const startX = event.clientX;
        const startY = event.clientY;
        const margin = drag.margin ?? 8;
        const view = node.ownerDocument.defaultView!;
        gesture.current = beginPointerGesture(
            {
                currentTarget: handle,
                button: event.button,
                pointerId: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                isPrimary: event.isPrimary,
            },
            {
                preventSelection: true,
                suppressClick: true,
                onMove: (next) =>
                    setOffset({
                        x:
                            start.x +
                            Math.max(
                                margin - rect.left,
                                Math.min(
                                    view.innerWidth - rect.right - margin,
                                    next.clientX - startX,
                                ),
                            ),
                        y:
                            start.y +
                            Math.max(
                                margin - rect.top,
                                Math.min(
                                    view.innerHeight - rect.bottom - margin,
                                    next.clientY - startY,
                                ),
                            ),
                    }),
                onFinish: () => {
                    gesture.current = null;
                },
            },
        );
    };
    const dialog = useDialogLifecycle({
        panel: panelRef,
        open,
        active,
        closing,
        escape: closeOnEscape,
        ignoreWithin: closeOn?.ignoreWithin,
        close: onClose,
        exitAfter,
    });
    const handleOverlayClick = () => {
        const pressed = overlayPressed.current;
        overlayPressed.current = false;
        if (active && pressed && (closeOn?.overlay ?? closeOnOverlayClick)) onClose();
    };

    return {
        root: {
            ref,
            linkState,
            'data-point-events': dataPointEvents,
            className: cx(styles.ModalSurface, rootClassName, ...root),
            'data-open': open,
            'data-entered': open,
            'data-closing': closing,
            'data-open-motion': isOpenAnimate(animate?.appearance) || undefined,
            role: 'presentation' as const,
            'aria-hidden': !open || !active,
            inert: !open || !active,
            align: alignItems ?? MODAL_DEFAULTS.align,
            justify: justifyContent ?? MODAL_DEFAULTS.justify,
            style: rootStyle,
        },
        overlay: {
            className: cx(styles.Overlay, overlayClassName),
            style: overlayStyle,
            onMouseDown: () => {
                overlayPressed.current = true;
            },
            onClick: handleOverlayClick,
            role: 'presentation' as const,
        },
        dialog: {
            id,
            state,
            ref: panelRef,
            role: 'dialog' as const,
            'aria-modal': true,
            'aria-label': ariaLabel,
            'aria-labelledby': ariaLabelledby,
            'data-smooth-scroll-ignore': true,
            tabIndex: -1,
            className: cx(
                styles.Panel,
                Boolean(controls) && styles.withControls,
                overflowVisible && styles.overflowVisible,
                ...c.value('preset', layout),
                ...panel,
                ...c.value('color', color),
                className,
            ),
            style: { ...panelStyle, ...(drag ? { translate: `${offset.x}px ${offset.y}px` } : {}) },
            onPointerDown: move,
            animate,
            perspective3d,
            parallax,
            ui: { motion: { open } },
            onMouseDown: () => {
                overlayPressed.current = false;
            },
            onClick: (event: MouseEvent<HTMLElement>) => event.stopPropagation(),
            onKeyDown: dialog.onKeyDown,
        },
        scroll: {
            ...scrollbarProps(scroll?.scrollbar),
            style: { ...scrollbarProps(scroll?.scrollbar).style, overflowY: scroll?.overflow },
            className: cx(
                'ui-scrollbar',
                styles.inner,
                overflowVisible && styles.innerOverflowVisible,
                scroll?.gutter === false && styles.noGutter,
                ...boxLayout(c, scroll ?? {}),
            ),
        },
        controls,
        children,
        close: onClose,
    };
}
