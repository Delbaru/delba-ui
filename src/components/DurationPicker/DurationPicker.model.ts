import { clamp } from '../../core';

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
  const requestedMaximum = maxMinutes ?? 1440;
  const maximum = Number.isFinite(requestedMaximum)
    ? Math.max(0, Math.round(requestedMaximum))
    : 1440;
  const total = clamp(Number.isFinite(value) ? Math.round(value) : 0, 0, maximum);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const maximumHours = Math.floor(maximum / 60);

  function commitHours(nextHours: number) {
    onValueChange(Math.min(maximum, nextHours * 60 + minutes));
  }

  function commitMinutes(nextMinutes: number) {
    onValueChange(hours * 60 + nextMinutes);
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
