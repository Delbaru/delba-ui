import type { ComponentStateValue } from '#core';
import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type React from 'react';
import type { BoxLayoutProps, WithRef } from '#core';

export interface CalendarProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'dir' | 'onChange'>,
        BoxLayoutProps {
    preset?: Preset<CalendarProps>;
    states?: PresetStates<CalendarProps>;
    state?: ComponentStateValue;
    /** Selected date as a local calendar value (`YYYY-MM-DD`), not a UTC timestamp. */
    value?: string;
    /** Called for each allowed pick of a `YYYY-MM-DD` date, including the current value. */
    onValueChange(value: string): void;
    /** Inclusive lower date bound in `YYYY-MM-DD` format. */
    minValue?: string;
    /** Inclusive upper date bound in `YYYY-MM-DD` format. */
    maxValue?: string;
    /** Prevents navigation and selection. */
    disabled?: boolean;
    /** Keeps day-button ids stable when Calendar is anchored to an existing field id. */
    dayIdPrefix?: string;
}

export type CalendarComponentProps = WithRef<CalendarProps, HTMLDivElement>;

export type CalendarPresets = PresetMap<CalendarProps>;
