'use client';

import { Fragment, useId, type ReactNode } from 'react';

import styles from './CarouselDots.module.scss';

import { useNearestCarouselControls } from '../controls';
import { Button } from '../../Button';
import { Flex, type FlexProps } from '../../Flex';
import { cx } from '../../../core';

export interface CarouselDotItem {
  /** Zero-based page index from the carousel, including grouped slides. */
  index: number;
  /** Current page; also updates after dragging or arrow navigation. */
  isActive: boolean;
  /** Navigate through the carousel's own API. */
  onSelect: () => void;
}

export interface CarouselDotsProps extends Omit<FlexProps, 'children'> {
  /** Connect to a carousel outside the nearest enclosing element. */
  carouselId?: string;
  /** Replace a dot with a thumbnail or label. The renderer owns the accessible button and its styling. */
  renderItem?: (item: CarouselDotItem) => ReactNode;
}

export function CarouselDots({ className, carouselId, renderItem, ...props }: CarouselDotsProps) {
  const baseId = useId().replace(/:/g, '');
  const { setRootRef, snapshot } = useNearestCarouselControls(carouselId);
  const shouldRender = snapshot.showDots && snapshot.pageCount > 1;

  return (
    <Flex
        ref={setRootRef}
        dir={['row', null, null]}
        align={['center', null, null]}
        justify={['center', null, null]}
        gap={[8, null, null]}
        className={cx(styles.CarouselDots, snapshot.paginationClassName, className)}
        data-carousel-dots
        {...props}
    >
      {shouldRender
        ? Array.from({ length: snapshot.pageCount }, (_, index) => {
          const isActive = index === snapshot.pageIndex;
          const dotId = `${baseId}-dot-${index}`;

          if (renderItem) return <Fragment key={dotId}>{renderItem({ index, isActive, onSelect: () => snapshot.api?.goTo(index) })}</Fragment>;

          return (
            <Button
                key={dotId}
                id={dotId}
                className={styles.dot}
                state={isActive ? 'active' : undefined}
                linkState={isActive ? undefined : dotId}
                aria-label={`Перейти к слайду ${index + 1}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => snapshot.api?.goTo(index)}
            />
          );
        })
        : null}
    </Flex>
  );
}
