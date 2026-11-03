import type React from 'react';
import type {
  AspectRatioProps,
  BoxLayoutProps,
  ContainerProp,
  GrowProps,
  LayoutSpaceProps,
  ResponsiveValue,
  SizeValue,
  StateLinkInput,
} from '../../core';
import type { RevealScopeProps } from '../../core/reveal/reveal';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { GridLayoutAnimate } from './layout';

export type Track =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52;

type JustifyItemsKey = 'start' | 'end' | 'center' | 'stretch';
type AlignItemsKey = 'start' | 'end' | 'center' | 'stretch';

type ItemJustifyContentKey =
  | 'flex_start'
  | 'flex_end'
  | 'start'
  | 'end'
  | 'center'
  | 'space_between'
  | 'space_around'
  | 'space_evenly';

type ItemAlignItemsKey =
  | 'stretch'
  | 'center'
  | 'flex_start'
  | 'flex_end'
  | 'start'
  | 'end'
  | 'baseline';
type AlignContentKey =
  | 'start'
  | 'end'
  | 'center'
  | 'stretch'
  | 'space_between'
  | 'space_around'
  | 'space_evenly';
type AutoFlowKey = 'row' | 'column' | 'dense' | 'row_dense' | 'column_dense';

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    BoxLayoutProps,
    ContainerProp,
    Omit<SharedMotionProps, 'animate'>,
    RevealScopeProps {
  children?: React.ReactNode;
  /** Появление либо точечное перестроение: `{ when: 'change', effect: 'layout' }` для keyed GridItem. */
  animate?: SharedMotionProps['animate'] | GridLayoutAnimate;
  /** Сворачивает весь Grid по высоте; `open` управляется состоянием снаружи. */
  collapse?: CollapseOptions;

  columns?: ResponsiveValue<Track>;
  rows?: ResponsiveValue<Track>;
  gap?: ResponsiveValue<number>;
  rowGap?: ResponsiveValue<number>;
  columnGap?: ResponsiveValue<number>;

  justifyItems?: ResponsiveValue<JustifyItemsKey>;
  alignItems?: ResponsiveValue<AlignItemsKey>;
  alignContent?: ResponsiveValue<AlignContentKey>;
  autoFlow?: ResponsiveValue<AutoFlowKey>;

  areas?: string[];
  items?: Array<GridItemLayout>;
  renderItem?: (item: GridItemLayout, index: number) => React.ReactNode;

  linkState?: StateLinkInput;
}

// 1..13 (13 is useful as "end line" for 12-column grid)
type Line =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52;

export interface GridItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    LayoutSpaceProps,
    AspectRatioProps,
    GrowProps,
    SharedMotionProps {
  children?: React.ReactNode;

  area?: string;

  colSpan?: ResponsiveValue<Track>;
  rowSpan?: ResponsiveValue<Track>;

  colStart?: ResponsiveValue<Line>;
  colEnd?: ResponsiveValue<Line>;
  rowStart?: ResponsiveValue<Line>;
  rowEnd?: ResponsiveValue<Line>;

  h?: ResponsiveValue<SizeValue>;
  w?: ResponsiveValue<SizeValue>;
  maxH?: ResponsiveValue<SizeValue>;
  maxW?: ResponsiveValue<SizeValue>;
  grow?: ResponsiveValue<number>;

  justifyContent?: ResponsiveValue<ItemJustifyContentKey>;
  alignItems?: ResponsiveValue<ItemAlignItemsKey>;
}

export interface GridItemLayout {
  key?: React.Key;
  className?: string;
  style?: React.CSSProperties;

  area?: string;

  colSpan?: ResponsiveValue<Track>;
  rowSpan?: ResponsiveValue<Track>;

  colStart?: ResponsiveValue<Line>;
  colEnd?: ResponsiveValue<Line>;
  rowStart?: ResponsiveValue<Line>;
  rowEnd?: ResponsiveValue<Line>;

  h?: ResponsiveValue<SizeValue>;
  w?: ResponsiveValue<SizeValue>;
  grow?: ResponsiveValue<number>;
  aspectRatio?: AspectRatioProps['aspectRatio'];

  justifyContent?: ResponsiveValue<ItemJustifyContentKey>;
  alignItems?: ResponsiveValue<ItemAlignItemsKey>;
}
