'use client';

import { UI_MESSAGES, formatUiMessage } from '../../../core/base/messages';

import { Fragment, useId } from 'react';

import styles from './CarouselDots.module.scss';

import { useNearestCarouselControls } from '../controls';
import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { cx } from '#core';

import type { CarouselDotsProps } from './CarouselDots.types';

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
                aria-label={formatUiMessage(UI_MESSAGES.carousel.goTo, { index: index + 1 })}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => snapshot.api?.goTo(index)}
            />
          );
        })
        : null}
    </Flex>
  );
}
