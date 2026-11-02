'use client';
'use no memo';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { cx, MOTION_END_BUFFER_MS, prefersReducedMotion } from '../../../../../core';
import { useMotionTime } from '../../../../../hooks/useMotionTime';
import { flattenAnimatableText } from '../../flattenText';
import { useTextSwap, commonAffixes } from '../../textReveal/useTextSwap';
import type { TextAnimationContext } from '../../types';
import type { TextSlideOptions } from '../types';

import styles from './TextSlideSwap.module.scss';

/** Changes only differing characters; unequal lengths share one changing middle segment. */
export function TextSlideSwap({ content, options }: TextAnimationContext<TextSlideOptions>) {
  const text = flattenAnimatableText(content) ?? '';
  const viewportRef = useRef<HTMLSpanElement | null>(null);
  const durationMs = useMotionTime('textSlide', 'duration', viewportRef, options?.duration);

  const { current, previous, generation } = useTextSwap(text, { durationMs, staggerMs: 0 });
  const lastHeightRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    vp.style.transition = 'none';
    vp.style.height = '';
    const curH = vp.getBoundingClientRect().height;
    const fromH = lastHeightRef.current;
    lastHeightRef.current = curH;
    const plan = Array.from(vp.querySelectorAll<HTMLElement>('[data-swap-cell]')).map((cell) => {
      const outEl = cell.querySelector<HTMLElement>('[data-swap-out]');
      const inEl = cell.querySelector<HTMLElement>('[data-swap-in]');
      return {
        cell,
        outW: outEl ? outEl.getBoundingClientRect().width : 0,
        inW: inEl ? inEl.getBoundingClientRect().width : 0,
      };
    });

    vp.style.transition = '';

    if (previous === null || fromH === null || prefersReducedMotion(vp.ownerDocument.defaultView)) return undefined;

    const animH = Math.abs(fromH - curH) > 0.5;
    const animW = plan.some((p) => Math.abs(p.outW - p.inW) > 0.5);
    if (!animH && !animW) return undefined;
    plan.forEach((p) => {
      p.cell.style.transition = 'none';
      p.cell.style.width = `${p.outW}px`;
    });
    if (animH) {
      vp.style.transition = 'none';
      vp.style.height = `${fromH}px`;
    }
    void vp.offsetWidth;
    plan.forEach((p) => {
      p.cell.style.transition = '';
      p.cell.style.width = `${p.inW}px`;
    });
    if (animH) {
      vp.style.transition = '';
      vp.style.height = `${curH}px`;
    }
    // Release transient pixel sizes so fonts and future wrapping remain native.
    const timer = setTimeout(() => {
      plan.forEach((p) => {
        p.cell.style.transition = 'none';
        p.cell.style.width = '';
      });
      vp.style.transition = 'none';
      vp.style.height = '';
      void vp.offsetWidth;
      plan.forEach((p) => {
        p.cell.style.transition = '';
      });
      vp.style.transition = '';
    }, durationMs + MOTION_END_BUFFER_MS);

    return () => clearTimeout(timer);
  }, [current, previous, durationMs]);

  const vars = { '--slide-swap-dur': `${durationMs}ms` } as CSSProperties;
  if (options?.by === 'text') {
    return (
      <span ref={viewportRef} className="ui-slide-swap ui-slide-swap-value" style={vars}>
        <span className="ui-slide-value-viewport">
          {previous !== null && (
            <span
                key={`out-${generation}`}
                data-swap-out=""
                aria-hidden="true"
                className="ui-slide-value-out"
            >
              {previous}
            </span>
          )}
          <span
              key={`in-${generation}`}
              data-swap-in=""
              className={previous === null ? 'ui-slide-value-static' : 'ui-slide-value-in'}
          >
            {current}
          </span>
        </span>
      </span>
    );
  }

  const currentChars = Array.from(current);
  const previousChars = previous === null ? null : Array.from(previous);
  const nbsp = (ch: string) => (ch === ' ' ? ' ' : ch);
  const { prefix, suffix } = commonAffixes(previous ?? '', current);
  const prevLen = previousChars?.length ?? 0;
  const curMidEnd = currentChars.length - suffix;
  const sameLen = previousChars !== null && prevLen === currentChars.length;

  const staticCell = (key: string, ch: string): ReactNode => (
    <span key={key} className={'ui-slide-swap-static'}>
      {nbsp(ch)}
    </span>
  );
  const swapCellNode = (key: string, outStr: string, inStr: string): ReactNode => (
    <span key={key} data-swap-cell="" className={'ui-slide-swap-cell'}>
      <span
          key={`out-${generation}`}
          data-swap-out=""
          className={'ui-slide-swap-out'}
          aria-hidden="true"
      >
        {nbsp(outStr)}
      </span>

      <span key={`in-${generation}`} data-swap-in="" className={'ui-slide-swap-in'}>
        {nbsp(inStr)}
      </span>
    </span>
  );
  const cells: { node: ReactNode; space: boolean }[] = [];
  const pushStatic = (key: string, i: number) =>
    cells.push({ node: staticCell(key, currentChars[i] ?? ''), space: currentChars[i] === ' ' });

  for (let i = 0; i < prefix; i++) pushStatic(`p${i}`, i);
  if (previousChars === null) {
    for (let i = 0; i < currentChars.length; i++) pushStatic(`i${i}`, i);
  } else if (sameLen) {
    for (let i = prefix; i < curMidEnd; i++) {
      if (previousChars[i] === currentChars[i]) pushStatic(`m${i}`, i);
      else
        cells.push({
          node: swapCellNode(`m${i}`, previousChars[i] ?? '', currentChars[i] ?? ''),
          space: currentChars[i] === ' ',
        });
    }
    for (let i = curMidEnd; i < currentChars.length; i++) pushStatic(`s${i}`, i);
  } else {
    const prevMid = previousChars.slice(prefix, prevLen - suffix).join('');
    const curMid = currentChars.slice(prefix, curMidEnd).join('');
    cells.push({ node: swapCellNode('mid', prevMid, curMid), space: false });
    for (let i = curMidEnd; i < currentChars.length; i++) pushStatic(`s${i}`, i);
  }
  const groups: ReactNode[] = [];
  let word: ReactNode[] = [];
  let wordKey = 0;
  const flushWord = () => {
    if (word.length === 0) return;
    groups.push(<span key={`w${wordKey++}`} className={'ui-slide-swap-word'}>{word}</span>);
    word = [];
  };
  cells.forEach((c) => {
    if (c.space) {
      flushWord();
      groups.push(c.node);
    } else word.push(c.node);
  });
  flushWord();

  return (
    <span
        ref={viewportRef}
        className={cx('TextSlideSwap', styles.TextSlideSwap, 'ui-slide-swap')}
        style={vars}
    >
      {groups}
    </span>
  );
}
