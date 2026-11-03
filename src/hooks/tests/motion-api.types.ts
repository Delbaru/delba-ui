import type { BoxProps } from '../../components/Box';
import type { FlexProps } from '../../components/Flex';
import type { GridProps } from '../../components/Grid/Grid.types';
import type { TextProps } from '../../components/Text';
import type { LexicalTextProps } from '../../components/RichText';
import type { ImgProps } from '../../components/Img';
import type { IconProps } from '../../components/Icon';
import type { ModalProps } from '../../components/Modal';

type Assert<Condition extends true> = Condition;
type ObjectOnly<Value> = Exclude<NonNullable<Value>, object> extends never
  ? Extract<NonNullable<Value>, readonly unknown[]> extends never ? true : false
  : false;
type NoLegacyProps<Props> = Extract<keyof Props, 'animation' | 'transitionKey' | 'reveal'> extends never ? true : false;

/** Compiled by the strict library type gate; tuples and strings must not re-enter public motion. */
export type ObjectMotionContract = [
  Assert<ObjectOnly<BoxProps['animate']>>,
  Assert<ObjectOnly<FlexProps['animate']>>,
  Assert<ObjectOnly<GridProps['animate']>>,
  Assert<ObjectOnly<TextProps['animate']>>,
  Assert<ObjectOnly<LexicalTextProps['animate']>>,
  Assert<ObjectOnly<ImgProps['animate']>>,
  Assert<ObjectOnly<IconProps['animate']>>,
  Assert<ObjectOnly<ModalProps['animate']>>,
  Assert<NoLegacyProps<BoxProps>>,
  Assert<NoLegacyProps<FlexProps>>,
  Assert<NoLegacyProps<GridProps>>,
  Assert<NoLegacyProps<TextProps>>,
  Assert<NoLegacyProps<LexicalTextProps>>,
  Assert<NoLegacyProps<ImgProps>>,
  Assert<NoLegacyProps<IconProps>>,
  Assert<NoLegacyProps<ModalProps>>,
];
