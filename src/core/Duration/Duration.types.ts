import type { InputHTMLAttributes, RefCallback } from 'react';

export interface DurationOptions {
    /** Controlled total in minutes. */
    value: number;
    onChange(minutes: number): void;
    maxMinutes?: number;
    disabled?: boolean;
    /** Changing scope discards the previous entity's unfinished draft. */
    scope?: unknown;
}

export type DurationUnit = 'hours' | 'minutes';

export interface DurationInputProps extends InputHTMLAttributes<HTMLInputElement> {
    value: string;
    'data-duration-unit': '60' | '1';
}

export interface DurationController {
    hoursProps: DurationInputProps;
    minutesProps: DurationInputProps;
    /** Attach to the editor's containing element for nonpassive wheel handling. */
    rootRef: RefCallback<HTMLElement>;
    commit(): void;
    cancel(): void;
    clamp(value: number): number;
}
