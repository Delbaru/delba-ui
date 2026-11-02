'use client';

import { createContext, useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useMergedRefs, type WithRef } from '../../core';
import type { AccordionHeading, AccordionProps } from './Accordion.types';

interface AccordionContextValue {
  rootId: string;
  selection: {
    isOpen: (value: string) => boolean;
    toggle: (value: string) => void;
    reveal: (value: string) => void;
  };
  position: { hold: (trigger: HTMLElement) => void };
  indicator: ReactNode;
  headingAs: AccordionHeading;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

const toList = (value: string | null | readonly string[] | undefined): readonly string[] =>
  value == null ? [] : typeof value === 'string' ? [value] : value;

const TRIGGER = 'data-accordion-trigger';

// Открытый пункт выше схлопывается — нажатый триггер уезжает вверх. Пока в аккордеоне идут переходы,
// не даём ему уйти под шапку (`scroll-padding-top`) и за верх экрана; в остальном окно не трогаем —
// иначе страница прокручивается на каждый клик. Свой скролл пользователя удержание отменяет.
const HOLD_MAX_MS = 2000;
const holdByRoot = new WeakMap<HTMLElement, () => void>();

function holdPosition(el: HTMLElement, root: HTMLElement | null) {
  if (!root) return;
  holdByRoot.get(root)?.();
  const document = root.ownerDocument;
  const view = document.defaultView;
  if (!view) return;
  const floor = parseFloat(view.getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const until = view.performance.now() + HOLD_MAX_MS;
  let frame = 0;
  let settled = 0;
  const stop = () => {
    view.cancelAnimationFrame(frame);
    view.removeEventListener('wheel', stop);
    view.removeEventListener('touchstart', stop);
    if (holdByRoot.get(root) === stop) holdByRoot.delete(root);
  };
  holdByRoot.set(root, stop);
  const tick = () => {
    const shift = Math.min(el.getBoundingClientRect().top - floor, 0);
    // `instant`: при `scroll-behavior: smooth` каждый кадр перезапускал бы плавный перелёт.
    if (Math.abs(shift) >= 1) view.scrollBy({ top: shift, behavior: 'instant' });
    const moving = (root?.getAnimations({ subtree: true }).length ?? 0) > 0;
    settled = moving || Math.abs(shift) >= 1 ? 0 : settled + 1;
    if (settled < 3 && view.performance.now() < until) frame = view.requestAnimationFrame(tick);
    else stop();
  };
  view.addEventListener('wheel', stop, { passive: true });
  view.addEventListener('touchstart', stop, { passive: true });
  frame = view.requestAnimationFrame(tick);
}


/** One selection owner for root, items and browser text search. */
export function useAccordion(props: WithRef<AccordionProps, HTMLElement>) {
  // Колбэк зовём через `props`: так TS сужает union по `multiple`, у деструктуры сужения нет.
  const {
    ref,
    className,
    multiple,
    value,
    defaultValue,
    onValueChange: _onValueChange,
    collapsible,
    indicator,
    headingAs = 'h3',
    ...rest
  } = props;
  const rootId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const setRootNode = useCallback((node: HTMLElement | null) => {
    const previousRoot = rootRef.current;
    if (previousRoot && previousRoot !== node) holdByRoot.get(previousRoot)?.();
    rootRef.current = node;
  }, []);
  const setRootRef = useMergedRefs(setRootNode, ref);
  const [inner, setInner] = useState<readonly string[]>(() => toList(defaultValue));
  const controlled = value !== undefined;
  const openList = controlled ? toList(value) : inner;

  const commit = (next: readonly string[]) => {
    if (!controlled) setInner(next);
    if (props.multiple) props.onValueChange?.([...next]);
    else props.onValueChange?.(next[0] ?? null);
  };

  const isOpen = (item: string) => openList.includes(item);

  const toggle = (item: string) => {
    if (isOpen(item)) {
      if (multiple) commit(openList.filter((v) => v !== item));
      else if (collapsible ?? true) commit([]);
    } else {
      commit(multiple ? [...openList, item] : [item]);
    }
  };

  const reveal = (item: string) => {
    if (!isOpen(item)) toggle(item);
  };

  // Триггеры ищем по id своего корня: у вложенного аккордеона он другой, и его стрелки сюда не доходят.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    rest.onKeyDown?.(event);
    const target = event.target as HTMLElement;
    if (event.defaultPrevented || target.getAttribute(TRIGGER) !== rootId) return;

    const triggers = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        `[${TRIGGER}="${CSS.escape(rootId)}"]:not(:disabled)`,
      ),
    );
    const index = triggers.indexOf(target);
    const last = triggers.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: index >= last ? 0 : index + 1,
      ArrowUp: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const nextIndex = moves[event.key];
    if (nextIndex === undefined) return;

    event.preventDefault();
    triggers[nextIndex]?.focus();
  };


  return {
    root: { ...rest, ref: setRootRef, className, 'data-accordion': rootId, onKeyDown },
    context: {
      rootId, indicator, headingAs,
      selection: { isOpen, toggle, reveal },
      position: { hold: (trigger: HTMLElement) => holdPosition(trigger, rootRef.current) },
    },
  };
}
