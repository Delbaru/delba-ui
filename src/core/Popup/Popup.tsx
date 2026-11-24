'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type MouseEvent, type KeyboardEvent, type FocusEvent } from 'react';
import { Dropdown, type DropdownProps } from '../../components/Dropdown';
import { Tooltip } from '../../components/Tooltip';
import { useTooltip } from '../../hooks/useTooltip';
import { ContextPopup, type ContextPoint } from './Context';

export type TooltipPopup = { preset: 'tooltip'; text: ReactNode; position?: 'top' | 'bottom' | 'left' | 'right'; on?: 'hover' };
type PopupController = { close(): void };
type MenuContent = ReactNode | ((popup: PopupController) => ReactNode);
type Panel = NonNullable<DropdownProps['panel']>;
export type PopupPlacement = 'top' | 'bottom' | 'left' | 'right';
export type MenuPosition = PopupPlacement | `${PopupPlacement}-${'start' | 'end'}`;
export type PopupOptions =
    | TooltipPopup
    | { preset: 'context'; on?: 'rightClick'; label?: string; children: MenuContent; panel?: Panel; boundary?: (opener: HTMLElement) => HTMLElement | null }
    | { preset: 'menu'; on?: 'click' | 'hover'; label?: string; children: MenuContent; panel?: Panel; position?: MenuPosition; consume?: boolean };

function inside(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) {
    const view = event.currentTarget.ownerDocument.defaultView;
    return Boolean(view && event.target instanceof view.Node && event.currentTarget.contains(event.target));
}
function nestedControl(event: MouseEvent<HTMLElement>) {
    const target = event.target as Element;
    const control = target.closest?.('a,button,input,textarea,select,label,[role="button"],[role="link"],[contenteditable]:not([contenteditable="false"]),[data-ui-popup-trigger]');
    return Boolean(control && control !== event.currentTarget && event.currentTarget.contains(control));
}

/** Touch-only browsers synthesize mouse enter before click; do not toggle twice. */
function coarsePointer(element: HTMLElement) {
    return element.ownerDocument.defaultView?.matchMedia('(pointer: coarse)').matches === true;
}

export function usePopup(options?: PopupOptions) {
    const anchor = useRef<HTMLElement | null>(null);
    const surface = useRef<HTMLElement | null>(null);
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [point, setPoint] = useState<ContextPoint | null>(null);
    const [open, setOpen] = useState(false);
    const [keyboard, setKeyboard] = useState(false);
    const kind = options?.preset === 'menu' ? options.on ?? 'click' : options?.preset;
    const [preset, setPreset] = useState(kind);
    if (preset !== kind) {
        setPreset(kind);
        setPoint(null);
        setOpen(false);
        setKeyboard(false);
    }
    const tooltipOptions = options?.preset === 'tooltip' ? options : undefined;
    const tooltipId = useId();
    const tooltip = useTooltip({
        enabled: Boolean(tooltipOptions), direction: tooltipOptions?.position ?? 'top',
        lazyPortal: true, hoverDelayMs: 400, resetKey: tooltipOptions?.text,
    });
    const clearTimer = () => {
        if (timeout.current !== null) clearTimeout(timeout.current);
        timeout.current = null;
    };
    useEffect(() => () => clearTimer(), [kind]);
    const close = () => { clearTimer(); setPoint(null); setOpen(false); setKeyboard(false); };
    const context = options?.preset === 'context';
    const menu = options?.preset === 'menu';
    const hover = menu && options.on === 'hover';
    const visible = context ? Boolean(point) : menu && open;
    const menuId = useId();
    const position = menu ? options.position ?? (hover ? 'top' : 'bottom-start') : 'bottom-start';
    const placement = position.split('-')[0] as PopupPlacement;
    const align = position.endsWith('-start') ? 'start' : position.endsWith('-end') ? 'end' : 'center';
    let content: ReactNode = null;
    if (context && point) {
        content = typeof options.children === 'function' ? options.children({ close }) : options.children;
    }

    function inRegion(target: EventTarget | null) {
        const view = anchor.current?.ownerDocument.defaultView;
        if (!view || !(target instanceof view.Node)) return false;
        if (anchor.current?.contains(target) || surface.current?.contains(target)) return true;
        // Reuse Dropdown's logical ancestry for portals nested inside this menu.
        return target instanceof view.Element && Boolean(target.closest('[data-dropdown-ancestors]')
            ?.getAttribute('data-dropdown-ancestors')?.split(' ').includes(menuId));
    }
    function leave(target: EventTarget | null, preserveFocus = false) {
        if (!hover || inRegion(target)) return;
        clearTimer();
        timeout.current = setTimeout(() => {
            if (preserveFocus && inRegion(anchor.current?.ownerDocument.activeElement ?? null)) return;
            close();
        }, 150);
    }
    function onMouseEnter(event: MouseEvent<HTMLElement>) {
        if (!inside(event) || nestedControl(event)) return;
        if (tooltipOptions) tooltip.anchorHandlers.onMouseEnter();
        if (hover && !coarsePointer(event.currentTarget)) { clearTimer(); setOpen(true); }
    }
    function onMouseLeave(event: MouseEvent<HTMLElement>) {
        if (!inside(event)) return;
        if (tooltipOptions) tooltip.anchorHandlers.onMouseLeave();
        if (!coarsePointer(event.currentTarget)) leave(event.relatedTarget, true);
    }
    function onFocus(event: FocusEvent<HTMLElement>) {
        if (event.target !== event.currentTarget) return;
        if (tooltipOptions) tooltip.anchorHandlers.onFocus();
        if (hover) clearTimer();
    }
    function onBlur(event: FocusEvent<HTMLElement>) {
        if (tooltipOptions && !inRegion(event.relatedTarget)) tooltip.anchorHandlers.onBlur();
        leave(event.relatedTarget);
    }
    function onContextMenu(event: MouseEvent<HTMLElement>) {
        if (!context || event.defaultPrevented || !inside(event) || nestedControl(event)) return;
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
            // Native buttons/anchors already generate a click for keyboard activation.
            if (event.key !== 'ArrowDown' && event.currentTarget.matches('button,a[href],input')) return;
            event.preventDefault();
            event.stopPropagation();
            clearTimer();
            setKeyboard(true);
            const expand = event.key === 'ArrowDown';
            setOpen(value => expand || !value);
        } else if (visible && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    }
    function onClick(event: MouseEvent<HTMLElement>) {
        if (!menu || event.defaultPrevented || !inside(event) || nestedControl(event)) return;
        // Hover has a tap/keyboard fallback; desktop pointer clicks do not close its panel.
        if (hover && event.detail !== 0 && !coarsePointer(event.currentTarget)) return;
        const nativeNavigation = event.currentTarget.matches('a[href],button[type="submit"],button[type="reset"]');
        if (nativeNavigation && options.consume !== true) return;
        if (options.consume !== false) event.preventDefault();
        event.stopPropagation();
        clearTimer();
        setKeyboard(event.detail === 0);
        setOpen(value => !value);
    }

    const popup = context && point ? (
        <ContextPopup id={menuId} point={point} onClose={close} label={options.label}
            boundary={options.boundary?.(point.opener)} panel={options.panel}>{content}</ContextPopup>
    ) : menu && open ? (
        <Dropdown anchorRef={anchor} surfaceRef={surface} open onOpenChange={next => { if (!next) close(); }}
            id={menuId} role="menu" aria-label={options.label} keyboard="menu" initialFocus={!hover || keyboard ? 'first' : undefined}
            returnFocus={hover && !keyboard ? false : anchor} closeOn={{ escape: true, blur: true }}
            panel={{ ...options.panel, portal: true, placement: options.position || hover ? placement : options.panel?.placement ?? placement,
                side: options.position || hover ? align : options.panel?.side ?? align,
                onMouseEnter: event => { options.panel?.onMouseEnter?.(event); if (hover) clearTimer(); },
                onMouseLeave: event => { options.panel?.onMouseLeave?.(event); leave(event.relatedTarget, true); },
                onFocus: event => { options.panel?.onFocus?.(event); if (hover) clearTimer(); },
                onBlur: event => { options.panel?.onBlur?.(event); leave(event.relatedTarget); },
            }}>
            {closeDropdown => typeof options.children === 'function' ? options.children({ close: closeDropdown }) : options.children}
        </Dropdown>
    ) : tooltipOptions ? (
        <Tooltip as="span" ref={tooltip.tooltipRef} id={tooltipId} {...tooltip.bubbleProps}>{tooltipOptions.text}</Tooltip>
    ) : null;
    return {
        anchor: tooltipOptions ? tooltip.anchorRef : anchor, popup, onContextMenu, onKeyDown, onClick,
        onMouseEnter, onMouseLeave, onFocus, onBlur, open: visible,
        describedBy: tooltipOptions && tooltip.isActive ? tooltipId : undefined,
        controls: visible && (menu || context) ? menuId : undefined,
    };
}
