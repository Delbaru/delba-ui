import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { TOAST_DEFAULTS } from './Toast.config';
import { appendToast } from './Toast.queue';
import type { ToastApi, ToastItem, ToastOptions } from './Toast.types';

/** One provider owns its cards and every timer until their exit completes. */
export function useToastQueue() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const sequence = useRef(0);
  const baseId = useId();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setHost(document.body);
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const close = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems(current => current.map(item => item.id === id ? { ...item, open: false } : item));
  }, []);

  const remove = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = `${baseId}-${sequence.current += 1}`;
    setItems(current => appendToast(current, { ...options, id, open: true }, TOAST_DEFAULTS.maxVisible));
    timers.current.set(id, setTimeout(() => close(id), options.durationMs ?? TOAST_DEFAULTS.durationMs));
  }, [baseId, close]);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);
  return { api, items, host, remove };
}
