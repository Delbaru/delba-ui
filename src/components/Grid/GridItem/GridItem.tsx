'use client';

import {
  boxLayout,
  composeInteractionHandlers,
  createLayoutClasses,
  cx,
  splitBoxLayout,
  stateLinkProps,
  useMergedRefs,
  type WithRef,
} from '../../../core';
import { useSharedMotion } from '../../../hooks/useSharedMotion';
import type { GridItemProps } from '../Grid.types';
import styles from './GridItem.module.scss';

const c = createLayoutClasses();

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
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({
    perspective3d,
    parallax,
    animate,
  });
  const setRefs = useMergedRefs(setMotionNode, ref);

  return (
    <div
      ref={setRefs}
      className={cx(
        'GridItem',
        styles.GridItem,
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
        className,
      )}
      style={{
        ...(area ? { gridArea: area } : null),
        ...(motionStyle ?? null),
        ...style,
      }}
      {...revealAttrs}
      {...rest}
      {...stateLinkProps(
        undefined,
        composeInteractionHandlers(motionHandlers, { ...rest, onMouseEnter, onMouseLeave }),
      )}
    >
      {children}
    </div>
  );
}
