import type { TextAnimate, TextProps } from '../../../src/components/Text';

export const timeline = {
  animate: {
    appearance: {
      when: 'inView',
      effect: { up: {}, counter: { to: 10, startAt: { effect: 'up', progress: 0.5 } } },
    },
    hover: { effect: 'rise' },
    idle: { effect: 'glow' },
  },
} satisfies TextProps;

export const textChange = {
  appearance: { when: 'load', effect: 'up' },
  change: { effect: 'textSlide', by: 'character' },
} satisfies TextAnimate;

export const nativeOption = {
  as: 'option',
  animate: { appearance: { when: 'load', effect: 'counter', to: 5 } },
  children: '0',
} satisfies TextProps;

const counter = { appearance: { when: 'load', effect: 'counter' } } as const;
const textHover = { hover: { effect: 'textSlide' } } as const;

// @ts-expect-error counter and slide hover both render the text slot
export const counterAndHover = { ...counter, ...textHover } satisfies TextAnimate;
// @ts-expect-error the hover and change effects both render the text slot
export const hoverAndChange = { ...textHover, change: { effect: 'textReveal' } } satisfies TextAnimate;
// @ts-expect-error change has no trigger field
export const changeWithTrigger = { change: { when: 'change', effect: 'counter' } } satisfies TextAnimate;
// @ts-expect-error sequences and character swaps select different renderer modes
export const conflictingModes = { change: { effect: 'textSlide', steps: ['A', 'B'], currentStep: 0, by: 'character' } } satisfies TextAnimate;
// @ts-expect-error the timeline uses a single host appearance effect
export const conflictingTimeline = { appearance: { when: 'load', effect: { up: {}, left: {} } } } satisfies TextAnimate;
