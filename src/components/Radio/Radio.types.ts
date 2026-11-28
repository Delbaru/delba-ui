import type React from 'react';
import type { CSSProperties } from 'react';
import type { ComponentStateValue, GrowProps, LayoutSpaceProps, RadiusPropsShort, ResponsiveValue, StateLinkInput } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, LayoutSpaceProps, RadiusPropsShort, GrowProps, Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
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
