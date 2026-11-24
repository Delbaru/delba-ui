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
    const close = () => { setPoint(null); setOpen(false); };
    const content = typeof options?.children === 'function' ? options.children({ close }) : options?.children;
    const context = options?.preset === 'context';
    const menu = options?.preset === 'menu';

    function onContextMenu(event: MouseEvent<HTMLElement>) {
        if (!context || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        setPoint({ x: event.clientX, y: event.clientY, opener: event.currentTarget });
    }
    function onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.defaultPrevented || event.target !== event.currentTarget) return;
        if (context && (event.key === 'ContextMenu' || event.shiftKey && event.key === 'F10')) {
            const rect = event.currentTarget.getBoundingClientRect();
            event.preventDefault();
            setPoint({ x: rect.left + 8, y: rect.top + 8, opener: event.currentTarget });
        } else if (menu && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setOpen(value => !value);
        }
    }
    function onClick(event: MouseEvent<HTMLElement>) {
        if (menu && !event.defaultPrevented) setOpen(value => !value);
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
    return { anchor, popup, onContextMenu, onKeyDown, onClick, open: context ? Boolean(point) : open };
}
