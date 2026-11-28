import type { FlexContentAnimate } from '../../hooks/contentMotion';
import type { ParallaxInput } from '../../hooks/useParallaxMotion';
import type { Perspective3dInput } from '../../hooks/usePerspective3dMotion';
import type { HoverTransformOptions } from '../base/hover-motion';
import type { MotionTime } from '../base/timing';
import type { AppearanceAnimate, OpenAnimate } from '../reveal/reveal';

export interface MotionChannelExtensions {
  appearance?: object;
  hover?: object;
  idle?: object;
  change?: object;
}

type Extension<Effects, Channel extends PropertyKey> = Channel extends keyof Effects ? Effects[Channel] : never;
type TriggeredEffect<Effect> = Effect & { when?: never };

export type MotionChannels<Effects extends MotionChannelExtensions = {}> = {
  appearance?: AppearanceAnimate | Extension<Effects, 'appearance'>;
  hover?: TriggeredEffect<HoverTransformOptions | SurfaceFillHover | Extension<Effects, 'hover'>> | false;
  idle?: TriggeredEffect<SurfaceIdleGlow | Extension<Effects, 'idle'>> | false;
  change?: TriggeredEffect<Extension<Effects, 'change'>>;
};

export interface MotionInput {
  appearance?: unknown;
  hover?: unknown;
  idle?: unknown;
  change?: unknown;
}

export type OpenMotionChannels = MotionChannels<{ appearance: OpenAnimate }>;

export interface MotionState {
  open?: boolean;
}

export interface SurfaceFillHover {
  /** Background fill rises inside the surface on hover or keyboard focus. */
  effect: 'rise';
  /** CSS color or gradient. Defaults to the theme's primary foreground. */
  fill?: string;
  duration?: MotionTime;
}

export interface SurfaceIdleGlow {
  /** The halo blends between colors while keeping its size. */
  effect: 'glow';
  color?: string;
  colorTo?: string;
  strength?: number;
  duration?: MotionTime;
}

export type SurfaceAnimate = MotionChannels<{ change: FlexContentAnimate }>;

export interface SurfaceMotionOptions {
  animate?: MotionInput;
  perspective3d?: Perspective3dInput;
  parallax?: ParallaxInput;
  open?: boolean;
  disabled?: boolean;
}

export interface SurfaceMotionEffects {
  glow: boolean;
}
