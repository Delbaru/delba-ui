import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type { BoxLayoutProps, ComponentStateValue } from '#core';
import type { ReactNode } from 'react';
import type { TooltipBubbleProps } from '../../hooks/useTooltip';

export interface TooltipProps extends TooltipBubbleProps, BoxLayoutProps {
    color?: string;
    preset?: Preset<TooltipProps>;
    states?: PresetStates<TooltipProps>;
    state?: ComponentStateValue;
    /** Inline host for tooltip bubbles rendered by inline controls. Default div. */
    as?: 'div' | 'span';
    children: ReactNode;
    className?: string;
    /** id всплывашки для связи с триггером через aria-describedby. */
    id?: string;
    /** Встроенная тёмная плашка. Выключается, если контент рисует свою поверхность. */
    surface?: boolean;
}

export type TooltipPresets = PresetMap<TooltipProps>;
