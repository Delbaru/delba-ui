'use client';

import type { WithRef } from '#core';
import { MotionLayers } from '#core/Motion';
import { useGridItem } from './GridItem.model';
import type { GridItemProps } from './GridItem.types';

export function GridItem(props: WithRef<GridItemProps, HTMLDivElement>) {
  const { root, effects, children } = useGridItem(props);

  return (
    <div {...root}>
      {root.dangerouslySetInnerHTML == null ? (
        <>
          {children}
          <MotionLayers effects={effects} />
        </>
      ) : children}
    </div>
  );
}
