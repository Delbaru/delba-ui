'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useCollapseState, type CollapseStateOptions } from '../../hooks/useCollapseState';
import type { CollapseOptions, CollapseSettings } from '../../components/Collapse/CollapseWrap';
import type { CollapseControls } from '../../hooks/useCollapseControls';

export interface CollapseDoor {
  open: boolean;
  settings: CollapseOptions;
  trigger?: { 'aria-expanded': boolean; onClick(): void };
  controls?: RefObject<CollapseControls | null>;
  show(): void;
  hide(): void;
  toggle(): void;
}

/** Public controller delegates open ownership to the existing state hook and
 * transitions to CollapseWrap. Commands describe intent, not a second motion engine.
 */
export type CollapseDoorOptions = CollapseStateOptions & Omit<CollapseSettings, 'onOpenChange' | 'ref'>;

export function useCollapse(options: CollapseDoorOptions = {}): CollapseDoor & { trigger: NonNullable<CollapseDoor['trigger']>; controls: RefObject<CollapseControls | null> } {
  const state = useCollapseState(options);
  const ref = useRef<CollapseControls | null>(null);
  const latest = useRef(state);
  useLayoutEffect(() => { latest.current = state; }, [state]);
  const show = () => { if (ref.current) void ref.current.show(); else latest.current.changeOpen(true); };
  const hide = () => { if (ref.current) void ref.current.hide(); else latest.current.changeOpen(false); };
  const toggle = () => { if (ref.current) void ref.current.toggle(); else latest.current.changeOpen(!latest.current.open); };
  const { open: _open, defaultOpen: _defaultOpen, onOpenChange: _onOpenChange, ...settings } = options;
  return {
    open: state.open,
    settings: { ...settings, open: state.open, onOpenChange: state.changeOpen, ref },
    trigger: { 'aria-expanded': state.open, onClick: toggle }, controls: ref,
    show, hide, toggle,
  };
}
