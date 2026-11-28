'use client';

import type { ReactElement } from 'react';
import { Flex } from '../Flex';
import { cx } from '#core';
import { useTabTrack } from './TabTrack.model';
import styles from './TabTrack.module.scss';
import { TAB_TRACK_BACKGROUNDS } from './TabTrack.config';
import type { TabTrackProps } from './TabTrack.types';
export type { TabTrackProps, TabTrackThumb } from './TabTrack.types';

/** Active-item track with one sliding thumb. Before measurement the active item paints itself. */
export function TabTrack({
  value,
  thumb,
  className,
  children,
  ...props
}: TabTrackProps): ReactElement {
  const track = useTabTrack(value, thumb);
  const bg = TAB_TRACK_BACKGROUNDS[thumb];

  return (
    <Flex
        ref={track.trackRef}
        className={cx(styles.TabTrack, className)}
        data-thumb={thumb}
        {...props}
    >
      {children}
      <Flex ref={track.thumbRef} aria-hidden className={styles.thumb}>
        <Flex bg={[bg ?? null, bg ?? null, bg ?? null]} className={cx(styles.part, styles.cap)} />
        <Flex bg={[bg ?? null, bg ?? null, bg ?? null]} className={cx(styles.part, styles.body)} />
        <Flex bg={[bg ?? null, bg ?? null, bg ?? null]} className={cx(styles.part, styles.cap)} />
      </Flex>
    </Flex>
  );
}
