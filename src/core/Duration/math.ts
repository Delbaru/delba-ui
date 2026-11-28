export const defaultDurationMaximum = 24 * 60;

export function durationMaximum(value = defaultDurationMaximum): number {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : defaultDurationMaximum;
}

export function clampDuration(value: number, maximum = defaultDurationMaximum): number {
    const total = Number.isFinite(value) ? Math.round(value) : 0;
    return Math.max(0, Math.min(durationMaximum(maximum), total));
}

export function durationParts(value: number, maximum = defaultDurationMaximum) {
    const total = clampDuration(value, maximum);
    return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export interface DurationModifiers {
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
}

export function durationStep(unit: number, modifiers: DurationModifiers) {
    if (modifiers.shiftKey) return 30;
    if (modifiers.ctrlKey || modifiers.metaKey) return 10;
    return unit;
}
