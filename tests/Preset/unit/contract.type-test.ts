import type { Preset, PresetMap, PresetProps } from '../../../src/core/Preset';
import type { ButtonProps } from '../../../src/components/Button';

export const presets = {
    secondary: {
        h: [32, 32, 32],
        p: [
            [4, 12],
            [4, 12],
            [4, 12],
        ],
        fontSize: [13, 13, 13],
        states: { hover: { bg: ['red', 'red', 'red'] }, disabled: { opacity: 0.4 } },
    },
} as const satisfies PresetMap<ButtonProps>;

export const readonlyPreset: Preset<ButtonProps> = presets.secondary;
export const nativeState: ButtonProps = { preset: readonlyPreset, state: ['selected', 'warning'] };
export const generic: PresetProps<ButtonProps> = { preset: readonlyPreset };
// @ts-expect-error Events stay on the native component instance.
export const behavior = { onClick: () => undefined } satisfies Preset<ButtonProps>;
// @ts-expect-error Presets cannot supply native data values.
export const data = { value: 'secret' } satisfies Preset<ButtonProps>;
// @ts-expect-error Responsive values require exactly three bands.
export const incomplete = { h: [32, 24] } satisfies Preset<ButtonProps>;
