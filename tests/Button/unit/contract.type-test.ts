import type { ButtonPresets, ButtonProps } from '../../../src/components/Button';
import type { InputPresets } from '../../../src/components/Input';
import type { TextareaProps } from '../../../src/components/Textarea';

export const button: ButtonProps = {
    children: 'More',
    animate: {
        appearance: { when: 'load', effect: 'fade' },
        hover: { effect: 'rise' },
        idle: { effect: 'glow' },
    },
    ui: { popup: { preset: 'tooltip', text: 'More actions', position: 'right', gap: 8 } },
};

// @ts-expect-error tooltip belongs to ui.popup
export const tooltip = { tooltip: 'More actions' } satisfies ButtonProps;
// @ts-expect-error tooltip position belongs to ui.popup
export const tooltipDirection = { tooltipDirection: 'right' } satisfies ButtonProps;
// @ts-expect-error tooltip gap belongs to ui.popup
export const tooltipGap = { tooltipGap: 8 } satisfies ButtonProps;
// @ts-expect-error appearance belongs to its own channel
export const appearance = { animate: { when: 'load', effect: 'fade' } } satisfies ButtonProps;

export const presets = {
    action: {
        h: [32, 32, 32],
        aspectRatio: [1, null, 1],
        dir: ['row-reverse', 'row', 'row-reverse'],
        fontSize: [14, 14, 14],
        lineHeight: [1.2, 1.2, 1.2],
        states: { hover: { bg: ['var(--surface)', null, null] }, disabled: { opacity: 0.4 } },
    },
} as const satisfies ButtonPresets;

export const presetButton = {
    preset: presets.action,
    dir: ['column', null, null],
} satisfies ButtonProps;
export const inputPresets = {
    compact: {
        p: [
            [4, 8],
            [4, 8],
            [4, 8],
        ],
        fontSize: [14, 14, 14],
        states: { error: { borderW: [1, 1, 1] } },
    },
} as const satisfies InputPresets;
export const textareaEditing = {
    autoGrow: true,
    autoContinue: (value, caret) => ({ value: value + '\n', caret: caret + 1 }),
    layout: 'row',
    slots: { actions: 'Send' },
} satisfies TextareaProps;

// @ts-expect-error native direction is the layout tuple, not the HTML dir attribute
export const invalidDirection = { dir: 'rtl' } satisfies ButtonProps;
// @ts-expect-error native event handlers stay on the instance, outside visual presets
export const invalidPreset = { action: { onClick: () => {} } } satisfies ButtonPresets;

export const namedButtonTypography = { preset: { font: 'body' } } satisfies ButtonProps;
export const namedTextareaTypography = {
    preset: { font: 'body' },
    gap: [8, 8, 8],
} satisfies TextareaProps;
