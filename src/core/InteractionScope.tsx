'use client';

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';

type Report = (id: string, active: boolean) => void;
const Scope = createContext<Report | null>(null);

export interface InteractionScopeProps {
  /** Узел области взаимодействия. Портальные окна учитываются по React-контексту. */
  target: RefObject<HTMLElement | null>;
  /** Дополнительно активировать область при приближении мыши к краю viewport. */
  edge?: 'top';
  /** Сообщает об открытом контроле, указателе или фокусе в области. */
  onChange?: (active: boolean) => void;
  /** Содержимое или совместимая render-функция активности. */
  children: ReactNode | ((active: boolean) => ReactNode);
}

/** Общая область взаимодействия для скрывающихся панелей, тулбаров и других контейнеров. */
export function InteractionScope({ target, edge, onChange, children }: InteractionScopeProps) {
  const parentReport = useContext(Scope);
  const locks = useRef(new Set<string>());
  const [held, setHeld] = useState(false);
  const [pointed, setPointed] = useState(false);
  const [focused, setFocused] = useState(false);
  const report = useCallback<Report>((id, active) => {
    parentReport?.(id, active);
    if (active) locks.current.add(id);
    else locks.current.delete(id);
    setHeld(locks.current.size > 0);
  }, [parentReport]);

  const active = held || pointed || focused;
  useEffect(() => { onChange?.(active); }, [active, onChange]);

  const connection = useRef<{ node: HTMLElement; edge: InteractionScopeProps['edge']; dispose(): void } | null>(null);
  useEffect(() => {
    const node = target.current;
    const previous = connection.current;
    if (node && previous?.node === node && previous.edge === edge) return;
    previous?.dispose();
    connection.current = null;
    setPointed(false);
    setFocused(false);
    if (!node) return;
    const dispose = observeInteractionTarget(node, edge, setPointed, setFocused);
    connection.current = { node, edge, dispose };
  });
  useEffect(() => () => {
    connection.current?.dispose();
    connection.current = null;
  }, []);

  return <Scope value={report}>{typeof children === 'function' ? children(active) : children}</Scope>;
}

/** Контрол сообщает об активности ближайшей области и освобождает её при unmount. */
export function useInteractionActivity(active: boolean) {
  const report = useContext(Scope);
  const id = useId();
  useEffect(() => {
    report?.(id, active);
    return () => report?.(id, false);
  }, [report, id, active]);
}

/** Document-bound pointer/focus observation; the React owner reconnects when its ref target changes. */
export function observeInteractionTarget(
  node: HTMLElement,
  edge: InteractionScopeProps['edge'],
  point: (active: boolean) => void,
  focus: (active: boolean) => void,
): () => void {
  const doc = node.ownerDocument;
  const view = doc.defaultView;
  if (!view) return () => {};
  let height = node.getBoundingClientRect().height;
  const style = view.getComputedStyle(node);
  const pinnedTop = (style.position === 'fixed' || style.position === 'sticky') && style.top === '0px';
  const pointerEdge = edge ?? (pinnedTop ? 'top' : undefined);
  let near = false;
  const contains = (target: EventTarget | null) => target instanceof view.Node && node.contains(target);
  const pointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const next = contains(event.target) || (pointerEdge === 'top' && event.clientY <= height);
    if (next !== near) point(next);
    near = next;
  };
  const leave = (event: PointerEvent) => {
    if (event.relatedTarget) return;
    near = false;
    point(false);
  };
  const focusChanged = (event: FocusEvent) => {
    focus(contains(event.type === 'focusout' ? event.relatedTarget : event.target));
  };
  focus(contains(doc.activeElement));
  const observer = view.ResizeObserver ? new view.ResizeObserver(([entry]) => {
    if (entry) height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
  }) : null;
  observer?.observe(node);
  doc.addEventListener('pointermove', pointer, { passive: true });
  doc.addEventListener('pointerout', leave);
  doc.addEventListener('focusin', focusChanged);
  doc.addEventListener('focusout', focusChanged);
  return () => {
    observer?.disconnect();
    doc.removeEventListener('pointermove', pointer);
    doc.removeEventListener('pointerout', leave);
    doc.removeEventListener('focusin', focusChanged);
    doc.removeEventListener('focusout', focusChanged);
  };
}
