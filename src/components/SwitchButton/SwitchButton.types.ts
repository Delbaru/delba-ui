import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, StateLinkInput } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';

export interface SwitchButtonProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
        BoxLayoutProps,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
    /** Native visual defaults; explicit props override each preset field. */
    preset?: Preset<SwitchButtonProps>;
    states?: PresetStates<SwitchButtonProps>;
    /** Motion on the label containing the native input. */
    animate?: MotionChannels;
    style?: CSSProperties;
    children?: React.ReactNode;
    gap?: ResponsiveValue<number>;
    state?: ComponentStateValue;
    'data-point-events'?: string;
    linkState?: StateLinkInput;
}

/** Named native visual defaults authored by the consumer. */
export type SwitchButtonPresets = PresetMap<SwitchButtonProps>;
