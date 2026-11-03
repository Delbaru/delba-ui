'use client';

import { Children, type ReactElement } from 'react';
import { Flex } from '../Flex';
import { cx } from '../../core';
import { motionDefaults } from '../../core/base/motion-config';
import { useMarquee } from './Marquee.model';
import type { MarqueeProps } from './Marquee.types';
import styles from './Marquee.module.scss';

export type { MarqueeProps } from './Marquee.types';

/** Continuous, draggable content. Only the original copy participates in accessibility. */
export function Marquee({
  children,
  as = 'div',
  gap,
  speed = motionDefaults.marquee.speed,
  reverse = false,
  paused = false,
  draggable = true,
  fade = false,
  className,
  ...props
}: MarqueeProps): ReactElement {
  const marquee = useMarquee({ speed, reverse, paused, draggable });
  const items = Children.toArray(children);

  return (
    <Flex
        ref={marquee.rootRef}
        className={cx(styles.Marquee, className)}
        data-fade={fade || undefined}
        data-draggable={draggable || undefined}
        minW={[0, 0, 0]}
        {...props}
    >
      <Flex
          ref={marquee.trackRef}
          gap={gap}
          w={['max-content', 'max-content', 'max-content']}
          className={styles.track}
      >
        {Array.from({ length: marquee.copies }, (_, i) => (
          <Flex
              key={i}
              as={as}
              gap={gap}
              m={[0, 0, 0]}
              p={[0, 0, 0]}
              className={styles.copy}
              aria-hidden={i > 0 || undefined}
              inert={i > 0 || undefined}
          >
            {items}
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
