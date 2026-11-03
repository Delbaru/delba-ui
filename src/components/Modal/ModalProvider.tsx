'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { DeclarationSlot } from './DeclarationSlot/DeclarationSlot';
import { acquireScrollLock } from './scroll-lock';
import { MOTION_END_BUFFER_MS, prefersReducedMotion } from '../../core';
import { readMotionTimeMs } from '../../core/base/timing';

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

type OpeningFrame = { view: Window; id: number; generation: number };

type ModalContextValue = {
  present: (node: ReactNode, options?: PresentModalOptions) => () => void;
  dismiss: () => void;
};

type ModalRegistryValue = ModalContextValue & {
  sync: (id: string, open: boolean, requestClose: () => void) => void;
  remove: (id: string) => void;
};

const ModalContext = createContext<ModalRegistryValue | null>(null);

type ModalRuntime = {
  open: boolean;
  active: boolean;
  closing: boolean;
  dismiss: () => void;
  exitAfter: (duration: number) => void;
};
const ModalRuntimeContext = createContext<ModalRuntime | null>(null);
const ModalDeclarationsContext = createContext<
  ReadonlyMap<string, { target: HTMLElement | null; runtime: ModalRuntime }>
>(new Map());

/** Internal portal: rendering stays in the declaration's React subtree and retains all its contexts. */
export function ModalDeclarationPortal({ id, children }: { id: string; children: ReactNode }) {
  const entry = useContext(ModalDeclarationsContext).get(id);
  if (!entry?.target) return null;
  return createPortal(
    <ModalRuntimeContext.Provider value={entry.runtime}>{children}</ModalRuntimeContext.Provider>,
    entry.target,
  );
}

const EXIT_FALLBACK_TIMING = 'normal';

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackItem[]>([]);
  const stackRef = useRef<StackItem[]>([]);
  const closingRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const openingFramesRef = useRef(new Map<string, OpeningFrame>());
  const openingGenerationRef = useRef(0);
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

  const cancelOpening = useCallback((id: string) => {
    const opening = openingFramesRef.current.get(id);
    if (!opening) return;
    openingFramesRef.current.delete(id);
    opening.view.cancelAnimationFrame(opening.id);
  }, []);

  const scheduleOpening = useCallback((id: string) => {
    const view = typeof window === 'undefined' ? null : window;
    if (!view) return;
    cancelOpening(id);
    const generation = ++openingGenerationRef.current;

    const enterAfterPaint = () => {
      const current = openingFramesRef.current.get(id);
      if (current?.generation !== generation) return;

      openingFramesRef.current.set(id, {
        view,
        generation,
        id: view.requestAnimationFrame(() => {
          if (openingFramesRef.current.get(id)?.generation !== generation) return;
          openingFramesRef.current.delete(id);
          if (!closingRef.current.has(id)) {
            updateStack((items) =>
              items.map((item) => (item.id === id ? { ...item, open: true } : item)),
            );
          }
        }),
      });
    };

    openingFramesRef.current.set(id, {
      view,
      generation,
      id: view.requestAnimationFrame(enterAfterPaint),
    });
  }, [cancelOpening, updateStack]);

  useLayoutEffect(
    () => () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
      for (const opening of openingFramesRef.current.values()) {
        opening.view.cancelAnimationFrame(opening.id);
      }
      openingFramesRef.current.clear();
    },
    [],
  );

  const remove = useCallback(
    (id: string) => {
      cancelOpening(id);
      const timer = timersRef.current.get(id);
      if (timer) clearTimeout(timer);
      timersRef.current.delete(id);
      closingRef.current.delete(id);
      updateStack((current) =>
        current.some((item) => item.id === id) ? current.filter((item) => item.id !== id) : current,
      );
    },
    [cancelOpening, updateStack],
  );

  const exitAfter = useCallback(
    (id: string, duration: number) => {
      const timer = timersRef.current.get(id);
      if (timer) clearTimeout(timer);
      timersRef.current.set(
        id,
        setTimeout(() => remove(id), duration),
      );
    },
    [remove],
  );

  const closeById = useCallback(
    (id: string) => {
      const item = stackRef.current.find((entry) => entry.id === id);
      if (!item || closingRef.current.has(id)) return;
      closingRef.current.add(id);
      cancelOpening(id);
      updateStack((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, open: false } : entry)),
      );
      // Modal reports its computed exit; plain presented nodes use the configured shared timing.
      const view = typeof window === 'undefined' ? null : window;
      const fallbackDuration =
        !view || prefersReducedMotion(view)
          ? 0
          : readMotionTimeMs(EXIT_FALLBACK_TIMING, view.document);
      const exitFallback = fallbackDuration + MOTION_END_BUFFER_MS;
      exitAfter(id, exitFallback);
      item.options.onClose?.();
    },
    [cancelOpening, updateStack, exitAfter],
  );

  const dismissById = useCallback(
    (id: string) => {
      const item = stackRef.current.find((entry) => entry.id === id);
      if (item?.options.requestClose) item.options.requestClose();
      else closeById(id);
    },
    [closeById],
  );

  const show = useCallback(
    (id: string, node: ReactNode, options: StackItem['options'], declarative = false) => {
      cancelOpening(id);
      const timer = timersRef.current.get(id);
      if (timer) clearTimeout(timer);
      timersRef.current.delete(id);
      closingRef.current.delete(id);
      updateStack((current) =>
        options.stackBehavior === 'replace'
          ? [{ id, node, options, open: false, declarative }]
          : [...current, { id, node, options, open: false, declarative }],
      );
      scheduleOpening(id);
    },
    [cancelOpening, scheduleOpening, updateStack],
  );

  const present = useCallback(
    (node: ReactNode, options: PresentModalOptions = {}) => {
      const id = `${baseId}-${(idRef.current += 1)}`;
      show(id, node, options);
      return () => dismissById(id);
    },
    [baseId, dismissById, show],
  );

  const sync = useCallback(
    (id: string, open: boolean, requestClose: () => void) => {
      if (!open) {
        closeById(id);
        return;
      }
      const item = stackRef.current.find((entry) => entry.id === id);
      if (!item) {
        show(id, null, { requestClose }, true);
        return;
      }
      if (item.options.requestClose === requestClose && !closingRef.current.has(id)) return;
      const timer = timersRef.current.get(id);
      if (timer) clearTimeout(timer);
      timersRef.current.delete(id);
      const reopening = closingRef.current.delete(id);
      if (reopening) scheduleOpening(id);
      updateStack((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, options: { requestClose }, open: reopening ? false : item.open }
            : item,
        ),
      );
    },
    [closeById, scheduleOpening, show, updateStack],
  );

  const dismiss = useCallback(() => {
    const top = stackRef.current.at(-1);
    if (top) dismissById(top.id);
  }, [dismissById]);

  const value = useMemo(
    () => ({ present, dismiss, sync, remove }),
    [present, dismiss, sync, remove],
  );
  const runtime = (item: StackItem): ModalRuntime => ({
    open: item.open,
    active: stack.filter((entry) => entry.open).at(-1)?.id === item.id,
    closing: closingRef.current.has(item.id),
    dismiss: () => dismissById(item.id),
    exitAfter: (duration) => exitAfter(item.id, duration),
  });
  const declarations = new Map(
    stack
      .filter((item) => item.declarative)
      .map((item) => [item.id, { target: targets.get(item.id) ?? null, runtime: runtime(item) }]),
  );

  const portalContent =
    stack.length > 0 &&
    (typeof document !== 'undefined'
      ? createPortal(
          <>
            {stack.map((item) =>
              item.declarative ? (
                <DeclarationSlot key={item.id} id={item.id} attach={attach} />
              ) : (
                <ModalRuntimeContext.Provider key={item.id} value={runtime(item)}>
                  {item.node}
                </ModalRuntimeContext.Provider>
              ),
            )}
          </>,
          document.body,
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
  if (!ctx) throw new Error('useModalAction must be used within modal content');
  return { dismiss: ctx.dismiss };
}

export function useModalRuntime(): ModalRuntime {
  const ctx = useContext(ModalRuntimeContext);
  if (!ctx) throw new Error('Modal must be rendered within presented modal content');
  return ctx;
}

export function useModalRegistry(): ModalRegistryValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('Modal must be used within ModalProvider');
  return ctx;
}
