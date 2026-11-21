'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { useAnchoredFloating, type FloatingAlign, type FloatingPlacement } from './useAnchoredFloating';

export interface UseTooltipOptions {
  enabled?: boolean;
  direction?: FloatingPlacement;
  align?: FloatingAlign;
  gap?: number;
  viewportPadding?: number;
  lazyPortal?: boolean;
  keepPositionWhenInactive?: boolean;
  /** Delay only pointer hover; keyboard focus remains immediate. Default 0 for existing kit consumers. */
  hoverDelayMs?: number;
  /** Reset hover/timer when label identity changes; preserve actual keyboard focus. */
  resetKey?: unknown;
}
export interface TooltipBubbleProps {
  portalNode: HTMLElement | null;
  style: CSSProperties;
  placement: FloatingPlacement;
  active: boolean;
}
export interface UseTooltipResult<A extends Element = HTMLElement, F extends HTMLElement = HTMLElement> {
  anchorRef: MutableRefObject<A | null>;
  tooltipRef: MutableRefObject<F | null>;
  isActive: boolean;
  show: () => void;
  hide: () => void;
  anchorHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
  bubbleProps: TooltipBubbleProps;
}

/** Single tooltip interaction model; reusable by Button/Icon/Input/DTooltip. */
export function useTooltip<A extends Element = HTMLElement, F extends HTMLElement = HTMLElement>({
  enabled = true, direction = 'bottom', align = 'center', gap = 8,
  viewportPadding = 8, lazyPortal = false, keepPositionWhenInactive = true,
  hoverDelayMs = 0, resetKey,
}: UseTooltipOptions = {}): UseTooltipResult<A,F> {
  const anchorRef = useRef<A | null>(null);
  const tooltipRef = useRef<F | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [hoverPending, setHoverPending] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const isActive = enabled && (hovered || focused);

  const clearPending = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setHoverPending(false);
  }, []);
  const hide = useCallback(() => {
    clearPending();
    setHovered(false);
  }, [clearPending]);
  const dismiss = useCallback(() => {
    clearPending();
    setHovered(false);
    setFocused(false);
  }, [clearPending]);
  const show = useCallback(() => {
    if (!enabled) return;
    clearPending();
    setHovered(true);
    if (lazyPortal) setShown(true);
  }, [enabled, clearPending, lazyPortal]);
  const hover = useCallback(() => {
    if (!enabled) return;
    clearPending();
    if (hoverDelayMs <= 0) { show(); return; }
    setHoverPending(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHoverPending(false);
      show();
    }, hoverDelayMs);
  }, [enabled, hoverDelayMs, clearPending, show]);
  const focus = useCallback(() => {
    if (!enabled) return;
    clearPending();
    setFocused(true);
    if (lazyPortal) setShown(true);
  }, [enabled, clearPending, lazyPortal]);
  const blur = dismiss;

  const { placement, isPositioned, style } = useAnchoredFloating({
    anchorRef, floatingRef: tooltipRef, isActive,
    placement: direction, align, gap, viewportPadding, keepPositionWhenInactive,
  });

  useEffect(() => {
    if (lazyPortal && !shown) return;
    const target = anchorRef.current?.ownerDocument.body ?? null;
    setPortalNode(current => current === target ? current : target);
  });
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    clearPending();
    setHovered(false);
    // Focus remains a live DOM fact across label changes and enable/disable.
    const anchor = anchorRef.current;
    const active = anchor?.ownerDocument.activeElement;
    setFocused(Boolean(enabled && anchor && active && (anchor === active || anchor.contains(active))));
  }, [enabled, resetKey, clearPending]);

  // Crucially: listeners are installed while hover is *pending*, not only after show.
  useEffect(() => {
    if (!enabled || !(isActive || hoverPending)) return;
    const doc = anchorRef.current?.ownerDocument;
    const view = doc?.defaultView;
    if (!doc || !view) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    const pointerOver = (event: PointerEvent) => {
      const anchor = anchorRef.current;
      if (anchor && event.target && anchor.contains(event.target as Node)) return;
      hide();
    };
    view.addEventListener('scroll', hide, true);
    view.addEventListener('blur', dismiss);
    doc.addEventListener('dragstart', dismiss, true);
    doc.addEventListener('pointerdown', dismiss, true);
    doc.addEventListener('pointerover', pointerOver, true);
    doc.addEventListener('keydown', keydown);
    return () => {
      view.removeEventListener('scroll', hide, true);
      view.removeEventListener('blur', dismiss);
      doc.removeEventListener('dragstart', dismiss, true);
      doc.removeEventListener('pointerdown', dismiss, true);
      doc.removeEventListener('pointerover', pointerOver, true);
      doc.removeEventListener('keydown', keydown);
    };
  }, [enabled, isActive, hoverPending, dismiss, hide]);

  return {
    anchorRef, tooltipRef, isActive, show, hide,
    anchorHandlers: { onMouseEnter: hover, onMouseLeave: hide, onFocus: focus, onBlur: blur },
    bubbleProps: { portalNode, style, placement, active: isActive && isPositioned },
  };
}
