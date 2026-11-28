import type { ButtonProps } from '../../../src/components/Button';

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
