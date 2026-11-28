import type { CSSProperties } from 'react';

import { motionTimeCss } from '../base/timing';
import type { MotionInput, SurfaceFillHover, SurfaceIdleGlow } from './SurfaceMotion.types';
import { isAppearanceAnimate, isOpenAnimate } from '../reveal/reveal';
import type { HoverTransformOptions } from '../base/hover-motion';

type SurfaceStyle = CSSProperties & {
  '--surface-hover-fill'?: string;
  '--surface-hover-duration'?: string;
  '--surface-glow-color'?: string;
  '--surface-glow-color-to'?: string;
  '--surface-glow-strength'?: number;
  '--surface-glow-duration'?: string;
};

type SurfaceAttributes = {
  'data-ui-hover'?: 'rise';
  'data-ui-idle'?: 'glow';
};

/** Resolve the independent surface channels for SSR and the client alike. */
function hasEffect<Effect extends { effect: string }>(value: unknown, name: Effect['effect']): value is Effect {
  return typeof value === 'object' && value !== null && 'effect' in value && value.effect === name;
}

export function resolveSurfaceMotion(animate: MotionInput | undefined, disabled = false) {
  const hover = disabled ? undefined : animate?.hover;
  const idle = disabled ? undefined : animate?.idle;
  const appearanceInput = animate?.appearance;
  const appearance = isAppearanceAnimate(appearanceInput) || isOpenAnimate(appearanceInput) ? appearanceInput : undefined;
  const transform = hasEffect<HoverTransformOptions>(hover, 'transform') ? hover : undefined;
  const rise = hasEffect<SurfaceFillHover>(hover, 'rise') ? hover : undefined;
  const glow = hasEffect<SurfaceIdleGlow>(idle, 'glow') ? idle : undefined;
  const attributes: SurfaceAttributes = {};
  const style: SurfaceStyle = {};

  if (rise) {
    attributes['data-ui-hover'] = 'rise';
    if (rise.fill !== undefined) style['--surface-hover-fill'] = rise.fill;
    if (rise.duration !== undefined) style['--surface-hover-duration'] = motionTimeCss(rise.duration);
  }

  if (glow) {
    attributes['data-ui-idle'] = 'glow';
    if (glow.color !== undefined) style['--surface-glow-color'] = glow.color;
    if (glow.colorTo !== undefined) style['--surface-glow-color-to'] = glow.colorTo;
    if (glow.strength !== undefined) style['--surface-glow-strength'] = glow.strength;
    if (glow.duration !== undefined) style['--surface-glow-duration'] = motionTimeCss(glow.duration);
  }

  return {
    appearance,
    hover: transform,
    attributes: rise || glow ? attributes : undefined,
    style: rise || glow ? style : undefined,
    effects: { glow: Boolean(glow) },
  };
}
