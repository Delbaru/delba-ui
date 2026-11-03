'use client';

import styles from './Grid.module.scss';
import { useRef } from 'react';
import {
  boxLayout,
  composeInteractionHandlers,
  containerClass,
  createLayoutClasses,
  cx,
  splitBoxLayout,
  stateLinkProps,
  useMergedRefs,
  type WithRef,
} from '../../core';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { CollapseWrap } from '../Collapse/CollapseWrap';
import { GridLayoutItems } from './GridLayoutItems';
import { isGridLayoutAnimate } from './layout';

import { GridItem } from './GridItem/GridItem';
import type { GridProps } from './Grid.types';
export type { GridProps, GridItemProps, GridItemLayout } from './Grid.types';
export { GridItem } from './GridItem/GridItem';

const c = createLayoutClasses();

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
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({
    perspective3d,
    parallax,
    animate: layoutMotion ? undefined : (animate as SharedMotionProps['animate']),
  });
  const setRefs = useMergedRefs(setMotionNode, ref, hostRef);
  const gridChildren =
    renderItem && items
      ? items.map((item, index) => {
          const { key, ...itemLayout } = item;
          return (
            <GridItem key={key ?? index} {...itemLayout}>
              {renderItem(item, index)}
            </GridItem>
          );
        })
      : children;
  const displayed = layoutMotion ? (
    <GridLayoutItems
        host={hostRef}
        options={layoutMotion}
        layoutKey={JSON.stringify([columns, rows, gap, rowGap, columnGap, areas, className])}
    >
      {gridChildren}
    </GridLayoutItems>
  ) : (
    gridChildren
  );

  const content = (
    <div
      ref={setRefs}
      className={cx(
          styles.Grid,
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
          className,
      )}
      style={{
        ...(areas ? { gridTemplateAreas: areas.map((r) => `"${r}"`).join(' ') } : null),
        ...(motionStyle ?? null),
        ...style,
      }}
      {...revealAttrs}
      {...rest}
      {...stateLinkProps(
        linkState,
        composeInteractionHandlers(motionHandlers, { ...rest, onMouseEnter, onMouseLeave }),
      )}
    >
      {displayed}
    </div>
  );

  if (!collapse) return content;
  return <CollapseWrap {...collapse} clip={box.minH != null}>{content}</CollapseWrap>;
}
