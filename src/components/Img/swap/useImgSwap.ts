'use client';

import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { MOTION_END_BUFFER_MS, prefersReducedMotion } from '#core';
import { motionTimeCss, readMotionTimeMs, type MotionTime } from '../../../core/base/timing';
import { resolveImgChange, type ImgChangeAnimate } from './types';
import { ImgSwap } from '../ImgSwap/ImgSwap';
import { readMotionDefaultMs } from '../../../core/base/motion-config';

interface SwapState {
  /** Снимок прежней картинки, пока идёт смена; null — смены нет. */
  outgoing: ReactNode | null;
  /** Снимок входящей картинки: во время хода держим его, даже если `src` уже сменился снова. */
  incoming: ReactNode | null;
  /** Номер смены: ключ слоёв, чтобы ключевые кадры шли заново на каждой смене. */
  turn: number;
  /** Новая картинка ещё грузится: держим прежнюю, ход не начинаем. */
  pending: boolean;
  /** Источник, загрузка которого может снять `pending`; поздний onLoad старого слоя не подходит. */
  pendingIdentity: string | null;
  /** Сторона этой смены — снимок опции на старте, чтобы клик посреди хода её не перевернул. */
  dir: 1 | -1;
}

/**
 * Смена картинки по смене `src`: прежняя остаётся слоем под новой, пока идёт ход, и снимается по
 * таймеру. Ход начинается, когда новая загрузилась (`onLoad` Img зовёт `loaded`), — пустой кадр
 * не въезжает. Смена посреди хода не обрывает его: ждёт конца и едет сразу к последнему `src`,
 * промежуточные пропускаются. Первый рендер без хода, «меньше движения» — мгновенная подмена.
 * Без `animate` отдаёт содержимое как есть.
 */
export function useImgSwap(
  change: ImgChangeAnimate | undefined,
  identity: string,
  renderContent: (loaded: () => void) => ReactNode,
): ReactNode {
  const config = resolveImgChange(change);
  const kind = config?.effect ?? null;
  const effect = kind === 'veil' && config?.veil == null ? 'fade' : kind;

  const [swap, setSwap] = useState<SwapState>({ outgoing: null, incoming: null, turn: 0, pending: false, pendingIdentity: null, dir: 1 });
  const content = renderContent(() => setSwap(state => (
    state.pending && state.pendingIdentity === identity
      ? { ...state, pending: false, pendingIdentity: null }
      : state
  )));
  const scopeRef = useRef<HTMLSpanElement | null>(null);
  const committedRef = useRef(identity);
  // Что сейчас на экране в покое: станет уходящим слоем на следующей смене.
  const shownRef = useRef<ReactNode>(content);
  const busy = swap.outgoing != null;

  // Смена источника в покое — поправка состояния в рендере: прежний кадр становится слоем в том же
  // коммите. Посреди хода не трогаем: следующий рендер после его конца начнёт смену к последнему src.
  if (kind == null && (busy || identity !== committedRef.current)) {
    committedRef.current = identity;
    setSwap(state => ({ ...state, outgoing: null, incoming: null, pending: false, pendingIdentity: null }));
  } else if (kind != null && identity !== committedRef.current && !busy) {
    const outgoing = shownRef.current;
    committedRef.current = identity;
    setSwap((s) =>
      prefersReducedMotion()
        ? { ...s, outgoing: null, incoming: null, turn: s.turn + 1, pending: false, pendingIdentity: null }
        : { outgoing, incoming: content, turn: s.turn + 1, pending: true, pendingIdentity: identity, dir: config?.direction ?? 1 },
    );
  }

  const current = busy && swap.incoming != null ? swap.incoming : content;
  if (!busy && identity === committedRef.current) shownRef.current = content;

  const duration: MotionTime | undefined = config?.duration;
  const running = kind !== null && busy && !swap.pending;

  // Ход доехал — снимаем прежний слой. Длительность — из опций или токена, вдвое у вуали.
  useEffect(() => {
    if (!running) return undefined;
    const base = duration === undefined ? readMotionDefaultMs('imgSwap', 'duration', scopeRef.current ?? undefined) : readMotionTimeMs(duration, scopeRef.current ?? undefined);
    const timer = window.setTimeout(() => {
      setSwap(state => ({ ...state, outgoing: null, incoming: null }));
    }, base * (effect === 'veil' ? 2 : 1) + MOTION_END_BUFFER_MS);
    return () => window.clearTimeout(timer);
  }, [running, swap.turn, duration, effect]);

  if (kind == null) return content;

  const style = {
    ...(config?.duration !== undefined ? { '--img-swap-d': motionTimeCss(config.duration) } : null),
    '--img-swap-dir': String(swap.dir),
  } as CSSProperties;

  return createElement(ImgSwap, {
    ref: scopeRef, effect, style, turn: swap.turn, busy, running, pending: swap.pending,
    outgoing: swap.outgoing, current, veil: config?.veil,
  });
}
