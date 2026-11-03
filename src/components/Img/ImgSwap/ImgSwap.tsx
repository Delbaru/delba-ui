import type { CSSProperties, ReactNode, Ref } from 'react';
import { cx } from '../../../core';
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
        className={cx(styles.ImgSwap, 'ui-img-swap')}
        data-effect={effect}
        style={style}
    >
      {busy && <span
          key={`out-${turn}`}
          className={cx('ui-img-swap-layer', running && 'ui-img-swap-out')}
          aria-hidden
      >{outgoing}</span>}
      <span
          key={`in-${turn}`}
          className={cx('ui-img-swap-layer', pending && 'ui-img-swap-pending', running && 'ui-img-swap-in')}
      >{current}</span>
      {running && effect === 'veil' && <span
          key={`veil-${turn}`}
          className="ui-img-swap-veil"
          aria-hidden
      >{veil}</span>}
    </span>
  );
}
