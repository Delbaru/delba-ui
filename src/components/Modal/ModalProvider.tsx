'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { acquireScrollLock } from './scroll-lock';

export type PresentModalOptions = {
  onClose?: () => void;
  stackBehavior?: 'stack' | 'replace';
};

type StackItem = {
  id: string;
  node: ReactNode;
  options: PresentModalOptions & { requestClose?: () => void };
  open: boolean;
  declarative: boolean;
};

type ModalContextValue = {
  present: (node: ReactNode, options?: PresentModalOptions) => () => void;
  dismiss: () => void;
};

type ModalRegistryValue = ModalContextValue & {
  sync: (id: string, open: boolean, requestClose: () => void) => void;
  remove: (id: string) => void;
};

const ModalContext = createContext<ModalRegistryValue | null>(null);

type ModalRuntime = { open: boolean; active: boolean; closing: boolean; dismiss: () => void; exitAfter: (duration: number) => void };
const ModalRuntimeContext = createContext<ModalRuntime | null>(null);
const ModalDeclarationsContext = createContext<ReadonlyMap<string, { target: HTMLElement | null; runtime: ModalRuntime }>>(new Map());

function DeclarationSlot({ id, attach }: { id: string; attach: (id: string, node: HTMLElement | null) => void }) {
  const ref = useCallback((node: HTMLDivElement | null) => attach(id, node), [attach, id]);
  return <div ref={ref} style={{ display: 'contents' }} />;
}

/** Internal portal: rendering stays in the declaration's React subtree and retains all its contexts. */
export function ModalDeclarationPortal({ id, children }: { id: string; children: ReactNode }) {
  const entry = useContext(ModalDeclarationsContext).get(id);
  if (!entry?.target) return null;
  return createPortal(<ModalRuntimeContext.Provider value={entry.runtime}>{children}</ModalRuntimeContext.Provider>, entry.target);
}

const CLOSE_DELAY_MS = 500;

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackItem[]>([]);
  const stackRef = useRef<StackItem[]>([]);
  const closingRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const idRef = useRef(0);
  const baseId = useId();
  const hasModals = stack.length > 0;
  const [targets, setTargets] = useState<ReadonlyMap<string, HTMLElement>>(new Map());
  const attach = useCallback((id: string, node: HTMLElement | null) => {
    setTargets((current) => {
      if ((current.get(id) ?? null) === node) return current;
      const next = new Map(current);
      if (node) next.set(id, node);
      else next.delete(id);
      return next;
    });
  }, []);

  // Closing windows stay in the stack until their exit finishes, so their lock stays too.
  useLayoutEffect(() => {
    if (!hasModals) return;
    return acquireScrollLock(document);
  }, [hasModals]);

  const updateStack = useCallback((update: (current: StackItem[]) => StackItem[]) => {
    const next = update(stackRef.current);
    stackRef.current = next;
    setStack(next);
  }, []);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
  }, []);

  const remove = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    closingRef.current.delete(id);
    updateStack((current) => current.some((item) => item.id === id) ? current.filter((item) => item.id !== id) : current);
  }, [updateStack]);

  const exitAfter = useCallback((id: string, duration: number) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.set(id, setTimeout(() => remove(id), duration));
  }, [remove]);

  const closeById = useCallback((id: string) => {
    const item = stackRef.current.find((entry) => entry.id === id);
    if (!item || closingRef.current.has(id)) return;
    closingRef.current.add(id);
    updateStack((current) => current.map((entry) => entry.id === id ? { ...entry, open: false } : entry));
    // Custom presented nodes without Modal still get a fallback; Modal reports its actual exit.
    exitAfter(id, CLOSE_DELAY_MS);
    item.options.onClose?.();
  }, [updateStack, exitAfter]);

  const dismissById = useCallback((id: string) => {
    const item = stackRef.current.find((entry) => entry.id === id);
    if (item?.options.requestClose) item.options.requestClose();
    else closeById(id);
  }, [closeById]);

  const show = useCallback((id: string, node: ReactNode, options: StackItem['options'], declarative = false) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    closingRef.current.delete(id);
    updateStack((current) => options.stackBehavior === 'replace'
      ? [{ id, node, options, open: false, declarative }]
      : [...current, { id, node, options, open: false, declarative }]);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      updateStack((current) => current.map((item) => item.id === id && !closingRef.current.has(id) ? { ...item, open: true } : item));
    }));
  }, [updateStack]);

  const present = useCallback(
    (node: ReactNode, options: PresentModalOptions = {}) => {
      const id = `${baseId}-${(idRef.current += 1)}`;
      show(id, node, options);
      return () => dismissById(id);
    },
    [baseId, dismissById, show]
  );

  const sync = useCallback((id: string, open: boolean, requestClose: () => void) => {
    if (!open) { closeById(id); return; }
    const item = stackRef.current.find((entry) => entry.id === id);
    if (!item) { show(id, null, { requestClose }, true); return; }
    if (item.options.requestClose === requestClose && !closingRef.current.has(id)) return;
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    const reopening = closingRef.current.delete(id);
    updateStack((current) => current.map((item) => item.id === id
      ? { ...item, options: { requestClose }, open: reopening || item.open }
      : item));
  }, [closeById, show, updateStack]);

  const dismiss = useCallback(() => {
    const top = stackRef.current.at(-1);
    if (top) dismissById(top.id);
  }, [dismissById]);

  const value = useMemo(() => ({ present, dismiss, sync, remove }), [present, dismiss, sync, remove]);
  const runtime = (item: StackItem): ModalRuntime => ({
    open: item.open,
    active: stack.filter((entry) => entry.open).at(-1)?.id === item.id,
    closing: closingRef.current.has(item.id),
    dismiss: () => dismissById(item.id),
    exitAfter: (duration) => exitAfter(item.id, duration),
  });
  const declarations = new Map(stack.filter((item) => item.declarative).map((item) =>
    [item.id, { target: targets.get(item.id) ?? null, runtime: runtime(item) }]));

  const portalContent =
    stack.length > 0 &&
    (typeof document !== 'undefined'
      ? createPortal(
          <>
            {stack.map((item) => item.declarative ? <DeclarationSlot
                key={item.id}
                id={item.id}
                attach={attach}
            /> : (
              <ModalRuntimeContext.Provider key={item.id} value={runtime(item)}>{item.node}</ModalRuntimeContext.Provider>
            ))}
          </>,
          document.body
        )
      : null);

  return (
    <ModalContext.Provider value={value}>
    <ModalDeclarationsContext.Provider value={declarations}>
      {children}
      {portalContent}
    </ModalDeclarationsContext.Provider>
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

export function useModalAction(): { dismiss: () => void } {
  const ctx = useContext(ModalRuntimeContext);
  if (!ctx)
    throw new Error('useModalAction must be used within modal content');
  return { dismiss: ctx.dismiss };
}

export function useModalRuntime(): ModalRuntime {
  const ctx = useContext(ModalRuntimeContext);
  if (!ctx)
    throw new Error('Modal must be rendered within presented modal content');
  return ctx;
}

export function useModalRegistry(): ModalRegistryValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('Modal must be used within ModalProvider');
  return ctx;
}
