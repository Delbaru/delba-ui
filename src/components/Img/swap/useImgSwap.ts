'use client';

import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { cx, MOTION_END_BUFFER_MS, prefersReducedMotion } from '../../../core';
import type { ImgAnimate, ImgSwapKey, ImgSwapOptions } from './types';

const keyOf = (animate: ImgAnimate | undefined): ImgSwapKey | null => (Array.isArray(animate) ? animate[0] : animate) ?? null;
const optionsOf = (animate: ImgAnimate | undefined): ImgSwapOptions | undefined => (Array.isArray(animate) && animate.length > 1 ? animate[1] : undefined);

interface SwapState {
  /** Снимок прежней картинки, пока идёт смена; null — смены нет. */
  outgoing: ReactNode | null;
  /** Номер смены: ключ слоёв, чтобы ключевые кадры шли заново на каждой смене. */
  turn: number;
  /** Новая картинка ещё грузится: держим прежнюю, ход не начинаем. */
  pending: boolean;
}

/**
 * Смена картинки по смене `src`: прежняя остаётся слоем под новой, пока идёт ход, и снимается по
 * таймеру. Ход начинается, когда новая загрузилась (`onLoad` Img зовёт `loaded`), — пустой кадр
 * не въезжает. Первый рендер без хода, «меньше движения» — мгновенная подмена. Без `animate`
 * отдаёт содержимое как есть.
 */
export function useImgSwap(animate: ImgAnimate | undefined, identity: string, content: ReactNode): { node: ReactNode; loaded: () => void } {
  const kind = keyOf(animate);
  const options = optionsOf(animate);
  const effect = kind === 'veil' && options?.veil == null ? 'fade' : kind;

  const [swap, setSwap] = useState<SwapState>({ outgoing: null, turn: 0, pending: false });
  const committedRef = useRef(identity);
  const stableRef = useRef<ReactNode>(content);

  // Смена источника — поправка состояния в рендере: прежний кадр становится слоем в том же коммите.
  if (kind != null && identity !== committedRef.current) {
    const outgoing = stableRef.current;
    committedRef.current = identity;
    setSwap((s) => (prefersReducedMotion() ? { outgoing: null, turn: s.turn + 1, pending: false } : { outgoing, turn: s.turn + 1, pending: true }));
  }
  if (!swap.pending) stableRef.current = content;

  const duration = options?.duration;
  const running = swap.outgoing != null && !swap.pending;

  // Ход доехал — снимаем прежний слой. Длительность — из опций или токена, вдвое у вуали.
  useEffect(() => {
    if (!running) return undefined;
    const base = duration != null ? duration * 1000 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-d-slow')) * 1000 || 700;
    const timer = window.setTimeout(() => setSwap((s) => ({ ...s, outgoing: null })), base * (effect === 'veil' ? 2 : 1) + MOTION_END_BUFFER_MS);
    return () => window.clearTimeout(timer);
  }, [running, swap.turn, duration, effect]);

  const loaded = () => setSwap((s) => (s.pending ? { ...s, pending: false } : s));

  if (kind == null) return { node: content, loaded };

  const style = {
    ...(duration != null ? { '--img-swap-d': `${duration}s` } : null),
    '--img-swap-dir': String(options?.direction ?? 1),
  } as CSSProperties;

  const node = createElement(
    'span',
    { className: 'ui-img-swap', 'data-effect': effect, style },
    swap.outgoing != null &&
      createElement('span', { key: `out-${swap.turn}`, className: cx('ui-img-swap-layer', running && 'ui-img-swap-out'), 'aria-hidden': true }, swap.outgoing),
    createElement('span', { key: `in-${swap.turn}`, className: cx('ui-img-swap-layer', swap.pending && 'ui-img-swap-pending', running && 'ui-img-swap-in') }, content),
    running && effect === 'veil' && createElement('span', { key: `veil-${swap.turn}`, className: 'ui-img-swap-veil', 'aria-hidden': true }, options?.veil),
  );

  return { node, loaded };
}
