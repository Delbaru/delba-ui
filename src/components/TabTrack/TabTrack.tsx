'use client';

import type { ComponentProps, ReactElement } from 'react';
import { Flex } from '../Flex';
import { cx } from '../../core';
import { useTabTrack } from './TabTrack.model';
import styles from './TabTrack.module.scss';

/** Чем бегунок рисует выбор: сплошной `primary`, белая пилюля на серой дорожке или линия под вкладкой. */
export type TabTrackThumb = 'primary' | 'white' | 'line';

export type TabTrackProps = Omit<ComponentProps<typeof Flex>, 'ref'> & {
  /**
   * Выбранная вкладка. Бегунок едет к узлу с `state~='active'` внутри дорожки, а значение нужно,
   * только чтобы знать, КОГДА мерить заново. `null` — не выбрана ни одна, бегунок гаснет.
   */
  value: string | null;
  thumb: TabTrackThumb;
};

const THUMB_BG: Record<TabTrackThumb, string | undefined> = {
  primary: 'var(--primary)',
  white: 'var(--white-100)',
  line: undefined,
};

/** Active-item track with one sliding thumb. Before measurement the active item paints itself. */
export function TabTrack({
  value,
  thumb,
  className,
  children,
  ...props
}: TabTrackProps): ReactElement {
  const track = useTabTrack(value, thumb);
  const bg = THUMB_BG[thumb];

  return (
    <Flex
        ref={track.trackRef}
        className={cx('TabTrack', styles.TabTrack, className)}
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
