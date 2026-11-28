'use client';

import Link from 'next/link';
import type { CSSProperties, ElementType, HTMLAttributes, Ref } from 'react';
import { useLinkPrefetch, type LinkPrefetchProps } from '../../hooks/useLinkPrefetch';
import { resolveLinkProps, shouldUseNextLink } from '../base/link-utils';
import { cx } from '../base/cn';
import type { StateLinkInput } from '../component-state';
import { resolvePopupOptions, usePopup, type PopupOptions } from '../Popup/Popup';
import type { SurfaceMotionOptions } from '../Motion';
import { useElement } from './Element';
import { splitElementEvents, type ElementEventLayer } from './Element.events';

export interface InteractiveRootProps extends HTMLAttributes<HTMLElement>, LinkPrefetchProps {
    href?: string;
    target?: string;
    rel?: string;
    download?: string | boolean;
    newTab?: boolean;
    nofollow?: boolean;
    noreferrer?: boolean;
}

export interface InteractiveElementOptions {
    root: InteractiveRootProps;
    as?: ElementType;
    ref?: Ref<HTMLElement>;
    refs?: readonly (Ref<HTMLElement> | undefined)[];
    motion?: SurfaceMotionOptions;
    popup?: PopupOptions;
    disabled?: boolean;
    linkState?: StateLinkInput;
    style?: CSSProperties;
    tailStyle?: CSSProperties;
    className?: string;
    events?: readonly ElementEventLayer[];
    afterEvents?: readonly ElementEventLayer[];
}

export function useInteractiveElement({
    root, as = 'div', ref, refs = [], motion, popup: popupOptions,
    disabled = false, linkState, style, tailStyle, className, events = [], afterEvents = [],
}: InteractiveElementOptions) {
    const { href, target, rel, download, newTab, nofollow, noreferrer, prefetch, ...props } = root;
    const isLink = Boolean(href);
    const nextLink = isLink && shouldUseNextLink(href, newTab ? '_blank' : target, download);
    const prepare = useLinkPrefetch(prefetch, href, nextLink && !disabled);
    const popupInput = resolvePopupOptions(disabled ? undefined : popupOptions);
    const popup = usePopup(popupInput);
    const { attributes, handlers } = splitElementEvents(props);
    const element = useElement({
        ref,
        refs: [...refs, popup.anchor],
        motion: { ...motion, disabled },
        style: { ...style, ...props.style },
        tailStyle,
        linkState: disabled ? undefined : linkState,
        events: [
            { handlers: disabled ? { onClick: event => {
                event.preventDefault();
                event.stopPropagation();
            } } : {} },
            { handlers, cancelable: disabled ? ['onClick'] : false },
            ...events,
            { handlers: { onMouseEnter: prepare.onIntent, onFocus: prepare.onIntent } },
            { handlers: popupInput ? {
                onMouseEnter: popup.onMouseEnter, onMouseLeave: popup.onMouseLeave,
                onFocus: popup.onFocus, onBlur: popup.onBlur,
                onClick: popup.onClick, onKeyDown: popup.onKeyDown,
                onContextMenu: popup.onContextMenu,
                onPointerDown: popup.onPointerDown, onPointerMove: popup.onPointerMove,
                onPointerUp: popup.onPointerUp, onPointerCancel: popup.onPointerCancel,
            } : {}, cancelable: [
                'onClick', 'onKeyDown', 'onContextMenu',
                'onPointerDown', 'onPointerMove', 'onPointerUp', 'onPointerCancel',
            ] },
            ...afterEvents,
        ],
    });
    const isMenu = popupInput && popupInput.preset !== 'tooltip';
    return {
        host: (isLink ? nextLink ? Link : 'a' : as) as ElementType,
        isLink,
        popup: popup.popup,
        effects: element.effects,
        root: {
            ...attributes,
            ...resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer }),
            ...(nextLink ? { prefetch: prepare.prefetch } : undefined),
            ...(isLink && disabled ? {
                ...(!nextLink ? { href: undefined } : undefined),
                tabIndex: -1,
                'aria-disabled': true,
            } : undefined),
            ref: element.ref,
            className: cx(className, root.className, element.className),
            style: element.style,
            ...element.attributes,
            'data-ui-popup-trigger': popupInput ? '' : undefined,
            'aria-describedby': [root['aria-describedby'], popup.describedBy].filter(Boolean).join(' ') || undefined,
            'aria-controls': root['aria-controls'] ?? popup.controls,
            'aria-haspopup': root['aria-haspopup'] ?? (isMenu ? 'menu' as const : undefined),
            'aria-expanded': root['aria-expanded'] ?? (isMenu ? popup.open : undefined),
            ...element.events,
        },
    };
}
