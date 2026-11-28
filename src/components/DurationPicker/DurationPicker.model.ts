import { clampDuration, durationMaximum, durationParts } from '#core/Duration';
import { durationPickerDefaults } from './DurationPicker.config';

export interface DurationWheelModel {
    value: number;
    max: number;
    onChange(value: number): void;
}

export interface DurationPickerModel {
    wheels: { hours: DurationWheelModel; minutes: DurationWheelModel };
}

/** Resolves a controlled duration into bounded wheel values and their minute commits. */
export function resolveDurationPickerModel(options: {
    value: number;
    maxMinutes?: number;
    onValueChange(minutes: number): void;
}): DurationPickerModel {
    const { value, maxMinutes, onValueChange } = options;
    const defaultMaximum = durationPickerDefaults.maxMinutes;
    const requestedMaximum = maxMinutes ?? defaultMaximum;
    const maximum = durationMaximum(requestedMaximum);
    const { hours, minutes } = durationParts(value, maximum);
    const maximumHours = Math.floor(maximum / 60);

    function commitHours(nextHours: number) {
        onValueChange(clampDuration(nextHours * 60 + minutes, maximum));
    }

    function commitMinutes(nextMinutes: number) {
        onValueChange(clampDuration(hours * 60 + nextMinutes, maximum));
    }

    return {
        wheels: {
            hours: { value: hours, max: maximumHours, onChange: commitHours },
            minutes: {
                value: minutes,
                max: hours === maximumHours ? maximum % 60 : 59,
                onChange: commitMinutes,
            },
        },
    };
}
