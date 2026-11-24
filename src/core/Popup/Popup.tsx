'use client';

import { useRef, useState, type ReactNode, type MouseEvent, type KeyboardEvent } from 'react';
import { Dropdown, type DropdownProps } from '../../components/Dropdown';
import { ContextPopup, type ContextPoint } from './Context';

export type TooltipPopup = { preset: 'tooltip'; text: ReactNode; position?: 'top' | 'bottom' | 'left' | 'right' };
type PopupController = { close(): void };
type MenuContent = ReactNode | ((popup: PopupController) => ReactNode);
type Panel = NonNullable<DropdownProps['panel']>;
export type PopupOptions =
    | { preset: 'context'; on?: 'rightClick'; label?: string; children: MenuContent; panel?: Panel; boundary?: (opener: HTMLElement) => HTMLElement | null }
    | { preset: 'menu'; on?: 'click'; label?: string; children: MenuContent; panel?: Panel; position?: 'bottom-start' | 'bottom-end' };

export function usePopup(options?: PopupOptions) {
    const anchor = useRef<HTMLElement | null>(null);
    const [point, setPoint] = useState<ContextPoint | null>(null);
    const [open, setOpen] = useState(false);
    const [preset, setPreset] = useState(options?.preset);
    if (preset !== options?.preset) {
        setPreset(options?.preset);
        setPoint(null);
        setOpen(false);
    }
    const close = () => { setPoint(null); setOpen(false); };
    const context = options?.preset === 'context';
    const menu = options?.preset === 'menu';
    const visible = context ? Boolean(point) : menu && open;
    let content: ReactNode = null;
    if (visible) content = typeof options?.children === 'function' ? options.children({ close }) : options?.children;

    function inside(event: MouseEvent<HTMLElement>) {
        const view = event.currentTarget.ownerDocument.defaultView;
        return Boolean(view && event.target instanceof view.Node && event.currentTarget.contains(event.target));
    }

    function onContextMenu(event: MouseEvent<HTMLElement>) {
        if (!context || event.defaultPrevented || !inside(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setPoint({ x: event.clientX, y: event.clientY, opener: event.currentTarget });
    }
    function onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.defaultPrevented || event.target !== event.currentTarget) return;
        if (context && (event.key === 'ContextMenu' || event.shiftKey && event.key === 'F10')) {
            const rect = event.currentTarget.getBoundingClientRect();
            event.preventDefault();
            event.stopPropagation();
            setPoint({ x: rect.left + 8, y: rect.top + 8, opener: event.currentTarget });
        } else if (menu && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
            event.preventDefault();
            event.stopPropagation();
            const expand = event.key === 'ArrowDown';
            setOpen(value => expand || !value);
        } else if (visible && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    }
    function onClick(event: MouseEvent<HTMLElement>) {
        if (!menu || event.defaultPrevented || !inside(event)) return;
        const target = event.target as Element;
        const control = target.closest?.('a,button,input,textarea,select,[role="button"],[contenteditable="true"]');
        if (control && control !== event.currentTarget && event.currentTarget.contains(control)) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(value => !value);
    }

    const popup = context && point ? (
        <ContextPopup point={point} onClose={close} label={options.label}
            boundary={options.boundary?.(point.opener)} panel={options.panel}>{content}</ContextPopup>
    ) : menu && open ? (
        <Dropdown anchorRef={anchor} open onOpenChange={next => { if (!next) close(); }}
            role="menu" aria-label={options.label} keyboard="menu" initialFocus="first"
            returnFocus={anchor} closeOn={{ escape: true, blur: true }}
            panel={{ ...options.panel, portal: true, side: options.position === 'bottom-end' ? 'end' : 'start' }}>
            {content}
        </Dropdown>
    ) : null;
    return { anchor, popup, onContextMenu, onKeyDown, onClick, open: visible };
}
