'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type PresentModalOptions = {
  onClose?: () => void;
  stackBehavior?: 'stack' | 'replace';
};

type StackItem = {
  id: string;
  node: ReactNode;
  options: PresentModalOptions;
  open: boolean;
};

type ModalContextValue = {
  present: (node: ReactNode, options?: PresentModalOptions) => () => void;
  dismiss: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const ModalRuntimeContext = createContext<{ open: boolean; active: boolean; dismiss: () => void } | null>(null);

const CLOSE_DELAY_MS = 500;

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackItem[]>([]);
  const stackRef = useRef<StackItem[]>([]);
  const closingRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const idRef = useRef(0);
  const baseId = useId();

  const updateStack = useCallback((update: (current: StackItem[]) => StackItem[]) => {
    const next = update(stackRef.current);
    stackRef.current = next;
    setStack(next);
  }, []);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
  }, []);

  const dismissById = useCallback((id: string) => {
    const item = stackRef.current.find((entry) => entry.id === id);
    if (!item || closingRef.current.has(id)) return;
    closingRef.current.add(id);
    updateStack((current) => current.map((entry) => entry.id === id ? { ...entry, open: false } : entry));
    const timer = setTimeout(() => {
      updateStack((current) => current.filter((entry) => entry.id !== id));
      closingRef.current.delete(id);
      timersRef.current.delete(id);
    }, CLOSE_DELAY_MS);
    timersRef.current.set(id, timer);
    item.options.onClose?.();
  }, [updateStack]);

  const present = useCallback(
    (node: ReactNode, options: PresentModalOptions = {}) => {
      const id = `${baseId}-${(idRef.current += 1)}`;
      updateStack((prev) => {
        if (options.stackBehavior === 'replace') {
          return [{ id, node, options, open: false }];
        }
        return [...prev, { id, node, options, open: false }];
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateStack((prev) =>
            prev.map((item) => (item.id === id && !closingRef.current.has(id) ? { ...item, open: true } : item))
          );
        });
      });

      return () => dismissById(id);
    },
    [baseId, dismissById, updateStack]
  );

  const dismiss = useCallback(() => {
    const top = stackRef.current.at(-1);
    if (top) dismissById(top.id);
  }, [dismissById]);

  const value: ModalContextValue = { present, dismiss };

  const portalContent =
    stack.length > 0 &&
    (typeof document !== 'undefined'
      ? createPortal(
          <>
            {stack.map((item) => (
              <ModalRuntimeContext.Provider
                key={item.id}
                value={{
                  open: item.open,
                  active: stack.filter((entry) => entry.open).at(-1)?.id === item.id,
                  dismiss: () => dismissById(item.id),
                }}
              >
                {item.node}
              </ModalRuntimeContext.Provider>
            ))}
          </>,
          document.body
        )
      : null);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {portalContent}
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

export function useModalRuntime(): { open: boolean; active: boolean; dismiss: () => void } {
  const ctx = useContext(ModalRuntimeContext);
  if (!ctx)
    throw new Error('Modal must be rendered within presented modal content');
  return ctx;
}
