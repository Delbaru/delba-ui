import { defaultDurationMaximum } from '../../core/Duration/math';

export const durationPickerDefaults = {
    maxMinutes: defaultDurationMaximum,
    label: 'Duration',
    labels: { hours: 'Hours', minutes: 'Minutes' },
} as const;
