export { Flex } from './Flex';
export type { FlexProps } from './Flex';
export type { FlexAnimate } from './Flex.types';
import type { SurfaceAnimate } from '#core/Motion';
export type FlexContentAnimate = NonNullable<SurfaceAnimate['change']>;
