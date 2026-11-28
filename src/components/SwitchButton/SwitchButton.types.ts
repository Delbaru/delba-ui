import type React from 'react';
import type { CSSProperties } from 'react';
import type { ComponentStateValue, GrowProps, LayoutSpaceProps, ResponsiveValue, StateLinkInput } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';

export interface SwitchButtonProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    LayoutSpaceProps,
    GrowProps,
    Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
  /** Motion on the label containing the native input. */
  animate?: MotionChannels;
  style?: CSSProperties;
  children?: React.ReactNode;
  gap?: ResponsiveValue<number>;
  state?: ComponentStateValue;
  'data-point-events'?: string;
  linkState?: StateLinkInput;
}
