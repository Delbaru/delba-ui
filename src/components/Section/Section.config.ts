import type { FlexProps } from '../Flex';

export const SECTION_DEFAULTS = {
  display: ['block', 'block', 'block'],
} as const satisfies Pick<FlexProps, 'display'>;
