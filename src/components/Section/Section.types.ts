import type { FlexProps } from '../Flex';

export type SectionProps = Omit<FlexProps,
  | 'as' | 'href' | 'target' | 'rel' | 'download'
  | 'newTab' | 'nofollow' | 'noreferrer'
>;
