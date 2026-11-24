'use client';

import { useRef } from 'react';
import { useCollapseState, type CollapseStateOptions } from '../../hooks/useCollapseState';
import type { CollapseOptions } from '../../components/Collapse/CollapseWrap';
import type { CollapseControls } from '../../hooks/useCollapseControls';

export interface CollapseDoor {
  open: boolean;
  settings: CollapseOptions;
  show(): void;
  hide(): void;
  toggle(): void;
}

/** Public controller delegates open ownership to the existing state hook and
 * transitions to CollapseWrap. Commands describe intent, not a second motion engine.
 */
export function useCollapse(options: CollapseStateOptions = {}): CollapseDoor {
  const state = useCollapseState(options);
  const ref = useRef<CollapseControls | null>(null);
  const show = () => { if (ref.current) void ref.current.show(); else state.changeOpen(true); };
  const hide = () => { if (ref.current) void ref.current.hide(); else state.changeOpen(false); };
  const toggle = () => { if (ref.current) void ref.current.toggle(); else state.changeOpen(!state.open); };
  return {
    open: state.open,
    settings: { open: state.open, onOpenChange: state.changeOpen, ref },
    show, hide, toggle,
  };
}
