import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, StateLinkInput } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, Omit<BoxLayoutProps, 'aspectRatio'>, Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
    /** Motion on the label containing the native input. */
    animate?: MotionChannels;
    /** Show the decorative checkbox; the native input and label are preserved. */
    indicator?: boolean;
    style?: CSSProperties;
    children?: React.ReactNode;
    indeterminate?: boolean;
    /** Vertical indicator alignment; start follows the first label line. */
    alignItems?: 'center' | 'start';
    gap?: ResponsiveValue<number>;
    state?: ComponentStateValue;
    /** Indicator size in theme units; default 24. */
    size?: ResponsiveValue<number>;
    /** Checkmark size in theme units; default 16. */
    iconSize?: ResponsiveValue<number>;
    'data-error'?: string;
    'data-point-events'?: string;
    linkState?: StateLinkInput;
}
