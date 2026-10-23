'use client';

import { cx, useMergedRefs } from '../../core';
import { useOpenPresence } from '../../hooks/useOpenPresence';
import { useSharedMotion } from '../../hooks/useSharedMotion';
import type { OpenAnimate } from '../../core/reveal/reveal';
import { Box, type BoxProps } from '../Box';
import styles from './Dropdown.module.scss';

export interface DropdownBackdropOptions extends Pick<BoxProps, 'bg' | 'className' | 'style'> {
  /** Shared enter/exit effect; defaults to a fast fade. */
  animate?: OpenAnimate;
}

/** Decorative outside-dismiss target in the same layer as its dropdown panel. */
export function DropdownBackdrop({ open, animate = { when: 'open', effect: 'fade', duration: 'fast' }, className, style, ...props }: DropdownBackdropOptions & { open: boolean }) {
  const { revealAttrs, motionStyle, setMotionNode } = useSharedMotion({ animate, open });
  const presence = useOpenPresence(open);
  const ref = useMergedRefs(presence.ref, setMotionNode);
  if (!presence.present) return null;
  return <Box
      {...props}
      ref={ref}
      className={cx(styles.backdrop, className)}
      style={{ ...motionStyle, ...style }}
      {...revealAttrs}
      data-open={open || undefined}
      aria-hidden="true"
      inert={!open}
  />;
}
