import type { CSSProperties, ReactNode, Ref } from 'react';
import { cx } from '#core';
import styles from './ImgSwap.module.scss';

interface ImgSwapProps {
  ref: Ref<HTMLSpanElement>;
  effect: string | null;
  style: CSSProperties;
  turn: number;
  busy: boolean;
  running: boolean;
  pending: boolean;
  outgoing: ReactNode;
  current: ReactNode;
  veil: ReactNode;
}

export function ImgSwap({ ref, effect, style, turn, busy, running, pending, outgoing, current, veil }: ImgSwapProps) {
  return (
    <span
        ref={ref}
        className={styles.ImgSwap}
        data-effect={effect}
        style={style}
    >
      {busy && <span
          key={`out-${turn}`}
          className={cx(styles.Layer, running && styles.Out)}
          aria-hidden
          inert
      >{outgoing}</span>}
      <span
          key={`in-${turn}`}
          className={cx(styles.Layer, pending && styles.Pending, running && styles.In)}
      >{current}</span>
      {running && effect === 'veil' && <span
          key={`veil-${turn}`}
          className={styles.Veil}
          aria-hidden
      >{veil}</span>}
    </span>
  );
}
