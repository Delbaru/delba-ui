import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ComponentStateValue, ResponsiveValue, StateLinkInput } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';

export interface RadioProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
        BoxLayoutProps,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
    /** Native visual defaults; explicit props override each preset field. */
    preset?: Preset<RadioProps>;
    states?: PresetStates<RadioProps>;
    /** Motion on the label containing the native input. */
    animate?: MotionChannels;
    /** Show the decorative radio indicator; the native input remains accessible. */
    indicator?: boolean;
    style?: CSSProperties;
    children?: React.ReactNode;
    gap?: ResponsiveValue<number>;
    state?: ComponentStateValue;
    // Цвет отмеченного состояния: success (зелёный, дефолт — «правильный ответ») / primary (синий — «выбран»).
    tone?: 'success' | 'primary';
    // Размер бокса в токенах (дефолт 20).
    size?: number;
    // Размер точки в токенах (дефолт 12).
    dotSize?: number;
    'data-point-events'?: string;
    linkState?: StateLinkInput;
}

/** Named native visual defaults authored by the consumer. */
export type RadioPresets = PresetMap<RadioProps>;
