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

  useEffect(() => {
    let height = target.current?.getBoundingClientRect().height ?? 0;
    const style = target.current ? getComputedStyle(target.current) : null;
    // У закреплённой верхней панели сохраняется зона возврата, даже когда она сдвинута за экран.
    const pointerEdge = edge ?? ((style?.position === 'fixed' || style?.position === 'sticky') && style.top === '0px' ? 'top' : undefined);
    let near = false;
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const next = !!target.current?.contains(event.target as Node) || (pointerEdge === 'top' && event.clientY <= height);
      if (next !== near) setPointed(next);
      near = next;
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) { near = false; setPointed(false); }
    };
    const focus = (event: FocusEvent) => {
      const node = event.type === 'focusout' ? event.relatedTarget : event.target;
      setFocused(node instanceof Node && !!target.current?.contains(node));
    };
    setFocused(!!target.current?.contains(document.activeElement));
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
    });
    if (target.current) observer.observe(target.current);
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerout', leave);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', focus);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointermove', pointer);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', focus);
    };
  }, [target, edge]);

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
