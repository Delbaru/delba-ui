import type React from 'react';
import type { AspectRatioProps, GrowProps, LayoutSpaceProps, ResponsiveValue, SizeValue } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';
import type { Track } from '../Grid.types';

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
    Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
  animate?: MotionChannels;
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
