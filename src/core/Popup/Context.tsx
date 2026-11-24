'use client';

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Dropdown, type DropdownProps } from '../../components/Dropdown';

export type ContextPoint = { x: number; y: number; opener: HTMLElement };
type Panel = NonNullable<DropdownProps['panel']>;

/** Reuse Dropdown's portal, geometry, keyboard and focus restoration. */
export function ContextPopup({ point, onClose, children, label = 'Действия', boundary, panel, onOpen }: {
    point: ContextPoint;
    onClose: () => void;
    children: ReactNode;
    label?: string;
    boundary?: HTMLElement | null;
    panel?: Panel;
    onOpen?: () => void;
}) {
    const opener = useRef<HTMLElement | null>(point.opener);
    opener.current = point.opener;
    const boundaryRef = useRef<HTMLElement | null>(boundary ?? null);
    boundaryRef.current = boundary ?? null;
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const closed = useRef(false);
    const close = () => {
        if (closed.current) return;
        closed.current = true;
        closeRef.current();
    };
    const surface = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        closed.current = false;
        onOpen?.();
    }, [point.x, point.y, point.opener]);

    useEffect(() => {
        const doc = point.opener.ownerDocument;
        const win = doc.defaultView;
        if (!win) return;
        const sources = new Map<EventTarget, { left: number; top: number }>();
        for (let ancestor: HTMLElement | null = point.opener; ancestor; ancestor = ancestor.parentElement) {
            sources.set(ancestor, { left: ancestor.scrollLeft, top: ancestor.scrollTop });
        }
        const viewport = { left: win.scrollX, top: win.scrollY };
        sources.set(win, viewport);
        sources.set(doc, viewport);
        const onScroll = (event: Event) => {
            if (event.target instanceof win.Node && surface.current?.contains(event.target)) return;
            const previous = event.target ? sources.get(event.target) : undefined;
            if (!previous) return;
            const current = event.target === doc || event.target === win
                ? { left: win.scrollX, top: win.scrollY }
                : event.target instanceof win.HTMLElement
                    ? { left: event.target.scrollLeft, top: event.target.scrollTop }
                    : undefined;
            if (current && (current.left !== previous.left || current.top !== previous.top)) close();
        };
        win.addEventListener('scroll', onScroll, true);
        win.addEventListener('resize', close);
        win.addEventListener('blur', close);
        return () => {
            win.removeEventListener('scroll', onScroll, true);
            win.removeEventListener('resize', close);
            win.removeEventListener('blur', close);
        };
    }, [point.opener]);

    return (
        <Dropdown
            point={{ x: point.x, y: point.y, target: point.opener }}
            open
            onOpenChange={next => { if (!next) close(); }}
            role="menu"
            data-context-menu
            aria-label={label}
            keyboard="menu"
            initialFocus="first"
            returnFocus={opener}
            closeOn={{ blur: true, escape: true }}
            blockOutsideClick
            panel={{
                ...panel,
                boundaryRef: boundary ? boundaryRef : panel?.boundaryRef,
                portal: true,
                keepMounted: false,
                strategy: 'fixed',
                offset: 0,
                side: 'start',
                onContextMenu: (event: MouseEvent<HTMLDivElement>) => {
                    panel?.onContextMenu?.(event);
                    event.preventDefault();
                },
                onClick: (event: MouseEvent<HTMLDivElement>) => {
                    panel?.onClick?.(event);
                    event.stopPropagation();
                },
            }}
            surfaceRef={surface}
        >
            {children}
        </Dropdown>
    );
}
