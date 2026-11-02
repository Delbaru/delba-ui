'use client';

import { useCallback, useLayoutEffect, useState, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { useAnchoredFloating, type FloatingAlign, type FloatingPlacement } from './useAnchoredFloating';
import { useOutsideDismiss, type DismissRef } from './useOutsideDismiss';

export type FloatingDismissReason = 'outside' | 'blur' | 'escape';

export interface UseFloatingSurfaceOptions {
  open: boolean;
  portal?: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  positionRef?: RefObject<HTMLElement | null>;
  surfaceRef: RefObject<HTMLElement | null>;
  outsideRefs?: readonly DismissRef[];
  regions?: readonly DismissRef[];
  placement?: FloatingPlacement;
  align?: FloatingAlign;
  gap?: number;
  viewportPadding?: number;
  keepPositionWhenInactive?: boolean;
  blockOutsideClick?: boolean;
  onDismiss(reason: FloatingDismissReason): void;
}

export function resolveFloatingPortalHost(anchor: HTMLElement | null): HTMLElement | null {
  if (!anchor) return null;
  const modal = anchor.closest<HTMLElement>('[role="dialog"][aria-modal="true"]');
  return modal?.parentElement ?? anchor.ownerDocument.body;
}

/** Owns portal placement, anchor positioning, and neutral dismissal for a floating surface. */
export function useFloatingSurface({
  open,
  portal = true,
  anchorRef,
  positionRef,
  surfaceRef,
  outsideRefs,
  regions = [],
  placement,
  align,
  gap,
  viewportPadding,
  keepPositionWhenInactive = true,
  blockOutsideClick = false,
  onDismiss,
}: UseFloatingSurfaceOptions) {
  const positionedRef = positionRef ?? surfaceRef;
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const nextPortalNode = portal ? resolveFloatingPortalHost(anchorRef.current) : null;
    setPortalNode((current) => current === nextPortalNode ? current : nextPortalNode);
  });

  const floating = useAnchoredFloating({
    anchorRef,
    floatingRef: positionedRef,
    isActive: portal && open,
    placement,
    align,
    gap,
    viewportPadding,
    keepPositionWhenInactive,
  });

  const dismiss = useCallback(() => onDismiss('outside'), [onDismiss]);
  const dismissProps = useOutsideDismiss(
    outsideRefs ?? [anchorRef, surfaceRef],
    dismiss,
    { enabled: open, escape: false, blockOutsideClick },
  );

  const contains = useCallback((target: EventTarget | null) => {
    const anchor = anchorRef.current;
    const view = anchor?.ownerDocument.defaultView;
    if (!view || !(target instanceof view.Node)) return false;
    const refs = [anchorRef, positionedRef, surfaceRef, ...regions];
    return refs.some((ref) => ref.current?.contains(target) ?? false);
  }, [anchorRef, positionedRef, regions, surfaceRef]);

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (open && !contains(event.relatedTarget)) onDismiss('blur');
  }, [contains, onDismiss, open]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (!open || event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    onDismiss('escape');
  }, [onDismiss, open]);

  return {
    portalNode,
    style: portal ? floating.style : undefined,
    placement: floating.placement,
    isPositioned: floating.isPositioned,
    updatePosition: floating.updatePosition,
    dismissProps,
    events: { onBlur, onKeyDown },
    contains,
  };
}
