'use client';

import { useAnimationVisibility } from '../../hooks/useAnimationVisibility';
import { useBaseMotion } from '../../hooks/useBaseMotion';
import { cx } from '../base/cn';
import { useMergedRefs } from '../useMergedRefs';
import { resolveSurfaceMotion } from './SurfaceMotion';
import type { SurfaceMotionOptions } from './SurfaceMotion.types';
import styles from './SurfaceMotion.module.scss';

export function useSurfaceMotion({ animate, perspective3d, parallax, open, disabled }: SurfaceMotionOptions) {
  const surface = resolveSurfaceMotion(animate, disabled);
  const {
    motionHandlers,
    motionStyle,
    revealAttrs,
    motionClassName,
    setMotionNode: setSharedNode,
  } = useBaseMotion({
    appearance: surface.appearance,
    hover: surface.hover,
    perspective3d,
    parallax,
    open,
  });
  const setAnimationNode = useAnimationVisibility(surface.effects.glow);
  const setMotionNode = useMergedRefs<HTMLElement | SVGElement>(setSharedNode, setAnimationNode);

  return {
    motionHandlers,
    motionStyle: surface.style ? { ...motionStyle, ...surface.style } : motionStyle,
    revealAttrs: surface.attributes ? { ...revealAttrs, ...surface.attributes } : revealAttrs,
    motionClassName: cx(motionClassName, surface.attributes && styles.SurfaceMotion),
    setMotionNode,
    effects: surface.effects,
  };
}
