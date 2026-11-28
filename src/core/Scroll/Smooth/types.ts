import type { SmoothScrollEasing, SmoothScrollOffset } from './smooth-scroll';

interface SmoothTuning {
  /** Fraction of remaining wheel travel per 60 Hz frame. */
  lerp?: number;
  wheelMultiplier?: number;
  /** Programmatic scroll duration in seconds. Defaults to a distance-based duration. */
  duration?: number;
  easing?: SmoothScrollEasing;
  /** Pixels, CSS length, CSS custom property or resolver. A target's scroll margin takes precedence. */
  offset?: SmoothScrollOffset;
  /** Enable the engine on touch and below desktop. Native touch gestures are always preserved. */
  mobile?: boolean;
  /** Intercept same-page anchors whose links and targets belong to the viewport. */
  anchors?: boolean;
  updateHash?: boolean;
}

export type SmoothOptions = SmoothTuning & (
  | { target: 'window'; pathname?: string }
  | { target: 'self'; pathname?: never }
);

export type SmoothScrollConfig = Required<Omit<SmoothTuning, 'duration'>> & { duration: number | undefined };

/** A position in pixels relative to the viewport, an element, a hash or a selector. */
export type SmoothScrollTarget = number | Element | string;

export interface SmoothScrollToOptions {
  block?: ScrollLogicalPosition;
  offset?: SmoothScrollOffset;
  /** Seconds. */
  duration?: number;
  easing?: SmoothScrollEasing;
  immediate?: boolean;
}

export interface SmoothScrollApi {
  scrollTo: (target: SmoothScrollTarget, options?: SmoothScrollToOptions) => void;
  stop: () => void;
  /** Live position of the scoped viewport. Reading it does not subscribe React. */
  readonly scrollY: number;
  subscribe: (listener: (scrollY: number) => void) => () => void;
}
