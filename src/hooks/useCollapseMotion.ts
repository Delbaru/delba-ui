'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { Transition, animateCollapse, type CollapseAxis } from '../core';

/** Ручка сворачивания: наружу отдаётся ТЕКУЩИЙ переход, командовать узлом императивом нельзя. */
export interface CollapseHandle {
  /** Ход, который вызвала последняя смена состояния; пока ничего не ехало — `Transition.done()`. */
  readonly transition: Transition;
}

export interface UseCollapseMotionOptions {
  open: boolean;
  axis: CollapseAxis;
  /** Блок, показанный с первого кадра, выезжает, а не стоит открытым. Читается ОДИН раз. */
  appear?: boolean;
  /** Размер ведёт внутренний слой: блоку мешает `minH`, либо ось — ширина. */
  sizeOnInner?: boolean;
  fade?: boolean;
  /** Закрытый блок остаётся в DOM (под `hidden`), а не уходит из него. */
  keepMounted?: boolean;
  onEnd?: () => void;
  onTransition?: (transition: Transition) => void;
}

export interface CollapseMotion<T extends HTMLElement> {
  /** Контент в DOM. При `keepMounted` закрытый узел остаётся, но прячется атрибутом. */
  mounted: boolean;
  /** Состояние покоя, которое держит CSS (`data-open`). */
  visualOpen: boolean;
  /** Раскрытие доехало: только тогда снимают клип и показывают выпадающее наружу. */
  settled: boolean;
  wrapRef: RefObject<T | null>;
  innerRef: RefObject<HTMLDivElement | null>;
  handle: CollapseHandle;
}

/**
 * Жизненный цикл сворачивания: монтирование, два состояния покоя и ход между ними на WAAPI
 * (`animateCollapse`). Открыто/закрыто решает React-состояние — хук только ведёт ход и отдаёт его
 * наружу; императив получает переход, а не командует узлом.
 *
 * Двух кадров «смонтировали закрытым → раскрыли» (как было на CSS-переходах) больше нет: состояние
 * доезжает layout-эффектами до первой отрисовки, а стартовый кадр хода держит `fill: 'backwards'`.
 */
export function useCollapseMotion<T extends HTMLElement = HTMLElement>(options: UseCollapseMotionOptions): CollapseMotion<T> {
  const { open, axis, appear = false, sizeOnInner = false, fade = false } = options;
  const [mounted, setMounted] = useState(open);
  const [visualOpen, setVisualOpen] = useState(open && !appear);
  const [settled, setSettled] = useState(open && !appear);
  const wrapRef = useRef<T | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const previousOpen = useRef(visualOpen);
  // Ручка стабильна: наружу уезжает один объект, в нём меняется только текущий ход.
  const handle = useRef<{ transition: Transition }>({ transition: Transition.done() });
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  });

  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Раскрытие ждёт, пока узел появится: ехать можно только от уже измеримого закрытого состояния.
  useLayoutEffect(() => {
    if (open && !mounted) return;
    setVisualOpen(open);
  }, [open, mounted]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;

    if (!wrap || !inner || previousOpen.current === visualOpen) return;
    previousOpen.current = visualOpen;

    // Находка поиска (beforematch): браузер прокрутит к совпадению сразу, блок обязан уже стоять.
    if (wrap.hasAttribute('data-instant')) {
      setSettled(visualOpen);

      return;
    }

    const content = inner.firstElementChild;
    const transition = animateCollapse(
      { wrap, inner, content: content instanceof HTMLElement ? content : null },
      { axis, open: visualOpen, sizeOnInner, fade }
    );

    handle.current.transition = transition;
    latest.current.onTransition?.(transition);
    if (!visualOpen) setSettled(false);

    transition.finished.then((result) => {
      if (result.status !== 'finished' || previousOpen.current !== visualOpen) return;

      if (visualOpen) setSettled(true);
      else setMounted(false);

      latest.current.onEnd?.();
    });
  }, [visualOpen, axis, sizeOnInner, fade]);

  // Ход не должен пережить узел: иначе промис не разрешится и закрытие «зависнет» в середине.
  useEffect(() => () => handle.current.transition.cancel(), []);

  return {
    mounted,
    visualOpen,
    settled: visualOpen && settled,
    wrapRef,
    innerRef,
    handle: handle.current,
  };
}
