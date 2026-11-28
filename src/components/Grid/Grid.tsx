'use client';

import type { WithRef } from '#core';
import { ElementFrame } from '#core/Element';
import { MotionLayers } from '#core/Motion';
import { useGrid } from './Grid.model';
import { GridItem } from './GridItem';
import { GridLayoutItems } from './GridLayoutItems';
import type { GridProps } from './Grid.types';

export function Grid(props: WithRef<GridProps, HTMLDivElement>) {
  const grid = useGrid(props);
  const { items, renderItem } = grid;
  const children = items && renderItem ? items.map((item, index) => {
    const { key, ...layout } = item;
    return <GridItem key={key ?? index} {...layout}>{renderItem(item, index)}</GridItem>;
  }) : grid.children;
  const content = grid.layout ? <GridLayoutItems {...grid.layout}>{children}</GridLayoutItems> : children;

  return (
    <ElementFrame collapse={grid.collapse}>
      <div {...grid.root}>
        {grid.root.dangerouslySetInnerHTML == null ? (
          <>
            {content}
            <MotionLayers effects={grid.effects} />
          </>
        ) : content}
      </div>
    </ElementFrame>
  );
}
