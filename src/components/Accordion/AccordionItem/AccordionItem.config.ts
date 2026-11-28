import type { ButtonProps, FlexProps } from '#components';

export const ACCORDION_ITEM_DEFAULTS = {
  dir: ['column', 'column', 'column'],
  trigger: {
    w: ['100%', '100%', '100%'],
    justifyContent: ['space_between', 'space_between', 'space_between'],
    textAlign: ['start', 'start', 'start'],
  },
} as const satisfies Pick<FlexProps, 'dir'> & {
  trigger: Pick<ButtonProps, 'w' | 'justifyContent' | 'textAlign'>;
};
