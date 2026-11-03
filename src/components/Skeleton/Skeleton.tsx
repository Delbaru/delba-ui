'use client';

import styles from './Skeleton.module.scss';

import { Flex } from '../Flex';
import { useAnimationVisibility } from '../../hooks/useAnimationVisibility';
import { cx, type ResponsiveValue } from '../../core';

export interface SkeletonProps {
  /** Ширина полосы. По умолчанию во всю доступную. */
  w?: ResponsiveValue<number | string>;
  /** Высота одной полосы; по умолчанию 16. */
  h?: ResponsiveValue<number | string>;
  r?: ResponsiveValue<number>;
  /** Число полос; последняя строка абзаца короче остальных. */
  rows?: number;
  gap?: ResponsiveValue<number>;
  className?: string;
}

/** Полосы загрузки с геометрией будущего содержимого. */
export function Skeleton({
  w = ['100%', '100%', '100%'],
  h = [16, 16, 16],
  r = [8, 8, 8],
  rows = 1,
  gap = [8, 8, 8],
  className,
}: SkeletonProps) {
  const visibilityRef = useAnimationVisibility();

  if (rows === 1) {
    return (
      <Flex
          ref={visibilityRef}
          w={w}
          h={h}
          r={r}
          bg={['var(--line)', 'var(--line)', 'var(--line)']}
          className={cx(styles.Skeleton, styles.stripe, className)}
      />
    );
  }

  return (
    <Flex
        ref={visibilityRef}
        dir={['column', 'column', 'column']}
        gap={gap}
        w={w}
        className={cx(styles.Skeleton, className)}
    >
      {Array.from({ length: rows }, (_row, index) => (
        <Flex
            key={index}
            w={index === rows - 1 ? ['70%', '70%', '70%'] : ['100%', '100%', '100%']}
            h={h}
            r={r}
            bg={['var(--line)', 'var(--line)', 'var(--line)']}
            className={styles.stripe}
        />
      ))}
    </Flex>
  );
}
