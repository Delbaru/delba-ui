'use client';

import type React from 'react';
import { useRef } from 'react';
import { boxLayout, composeInteractionHandlers, containerClass, createLayoutClasses, cx, splitBoxLayout, stateLinkProps, useMergedRefs, type AspectRatioProps, type BoxLayoutProps, type ContainerProp, type GrowProps, type LayoutSpaceProps, type ResponsiveValue, type SizeValue, type StateLinkInput, type WithRef } from '../../core';
import type { RevealProps } from '../../core/reveal/reveal';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { CollapseWrap, type CollapseOptions } from '../Collapse/CollapseWrap';
import { GridLayoutItems } from './GridLayoutItems';
import { isGridLayoutAnimate, type GridLayoutAnimate } from './layout';

type Track =
1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12|
13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 |
33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 |
43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52;

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
type AlignContentKey = 'start' | 'end' | 'center' | 'stretch' | 'space_between' | 'space_around' | 'space_evenly';
type AutoFlowKey = 'row' | 'column' | 'dense' | 'row_dense' | 'column_dense';

const c = createLayoutClasses();

export interface GridProps extends React.HTMLAttributes<HTMLDivElement>, BoxLayoutProps, ContainerProp, Omit<SharedMotionProps, 'animate'>, RevealProps {
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

export function Grid({
  ref,
  children,
  collapse,
  className = '',
  style,
  columns,
  rows,
  gap,
  rowGap,
  columnGap,
  perspective3d,
  parallax,
  animate,
  reveal,
  justifyItems,
  alignItems,
  alignContent,
  autoFlow,
  areas,
  items,
  renderItem,
  container,
  linkState,
  onMouseEnter,
  onMouseLeave,
  ...props
}: WithRef<GridProps, HTMLDivElement>) {
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const layoutMotion = isGridLayoutAnimate(animate) ? animate : undefined;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate: layoutMotion ? undefined : animate as SharedMotionProps['animate'], reveal: layoutMotion ? undefined : reveal });
  const setRefs = useMergedRefs(setMotionNode, ref, hostRef);
  const gridChildren = renderItem && items ? items.map((item, index) => {
    const { key, ...itemLayout } = item;
    return <GridItem key={key ?? index} {...itemLayout}>{renderItem(item, index)}</GridItem>;
  }) : children;
  const displayed = layoutMotion ? (
    <GridLayoutItems
        host={hostRef}
        options={layoutMotion}
        layoutKey={JSON.stringify([columns, rows, gap, rowGap, columnGap, areas, className])}
    >
      {gridChildren}
    </GridLayoutItems>
  ) : gridChildren;

  const content = (
  <div
    ref={setRefs}
    className={cx(
      'ui-grid',
      layoutMotion && 'ui-grid-layout',
      containerClass(container),
      ...layout,
      ...c.value('columns', columns),
      ...c.value('rows', rows),
      ...c.value('gap', gap),
      ...c.value('rowGap', rowGap),
      ...c.value('columnGap', columnGap),
      ...c.value('justifyItems', justifyItems),
      ...c.value('align', alignItems),
      ...c.value('alignContent', alignContent),
      ...c.value('autoFlow', autoFlow),
      className
    )}
    style={{
      ...(areas ? { gridTemplateAreas: areas.map((r) => `"${r}"`).join(' ') } : null),
      ...(motionStyle ?? null),
      ...style,
    }}
    {...revealAttrs}
    {...rest}
    {...stateLinkProps(linkState, composeInteractionHandlers(motionHandlers, { ...rest, onMouseEnter, onMouseLeave }))}
  >
    {displayed}
  </div>
  );

  if (!collapse) return content;
  return <CollapseWrap {...collapse} clip={box.minH != null}>{content}</CollapseWrap>;
}

// 1..13 (13 is useful as "end line" for 12-column grid)
type Line = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12|
13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 |
33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 |
43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52;

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement>, LayoutSpaceProps, AspectRatioProps, GrowProps, SharedMotionProps {
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

export function GridItem({
  ref,
  children,
  className = '',
  style,
  area,
  colSpan,
  rowSpan,
  colStart,
  colEnd,
  rowStart,
  rowEnd,
  perspective3d,
  parallax,
  animate,
  justifyContent,
  alignItems,
  onMouseEnter,
  onMouseLeave,
  ...props
}: WithRef<GridItemProps, HTMLDivElement>) {
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const hasFlex = justifyContent !== undefined || alignItems !== undefined;
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });
  const setRefs = useMergedRefs(setMotionNode, ref);

  return (
    <div
      ref={setRefs}
      className={cx(
        hasFlex && 'ui-grid-item-flex',
        ...c.value('colSpan', colSpan),
        ...c.value('rowSpan', rowSpan),
        ...c.value('colStart', colStart),
        ...c.value('colEnd', colEnd),
        ...c.value('rowStart', rowStart),
        ...c.value('rowEnd', rowEnd),
        ...layout,
        ...c.value('justify', justifyContent),
        ...c.value('align', alignItems),
        className
      )}
      style={{
        ...(area ? { gridArea: area } : null),
        ...(motionStyle ?? null),
        ...style,
      }}
      {...revealAttrs}
      {...rest}
      {...stateLinkProps(undefined, composeInteractionHandlers(motionHandlers, { ...rest, onMouseEnter, onMouseLeave }))}
    >
      {children}
    </div>
  );
}
