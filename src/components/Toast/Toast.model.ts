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
  const active = useRef(true);
  const timers = useRef(new Map<string, { deadline: number; timer?: ReturnType<typeof setTimeout> }>());

  const close = useCallback((id: string) => {
    clearTimeout(timers.current.get(id)?.timer);
    timers.current.delete(id);
    setItems(current => current.map(item => item.id === id ? { ...item, open: false } : item));
  }, []);

  const remove = useCallback((id: string) => {
    clearTimeout(timers.current.get(id)?.timer);
    timers.current.delete(id);
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    if (!active.current) return;
    const id = `${baseId}-${sequence.current += 1}`;
    setItems(current => appendToast(current, { ...options, id, open: true }, TOAST_DEFAULTS.maxVisible));
    const duration = options.durationMs ?? TOAST_DEFAULTS.durationMs;
    timers.current.set(id, { deadline: Date.now() + duration, timer: setTimeout(() => close(id), duration) });
  }, [baseId, close]);

  useEffect(() => {
    active.current = true;
    setHost(document.body);
    const pending = timers.current;
    // StrictMode replays cleanup while retaining state. Resume surviving deadlines, never immortal cards.
    for (const [id, task] of pending) {
      if (task.timer === undefined) task.timer = setTimeout(() => close(id), Math.max(0, task.deadline - Date.now()));
    }
    return () => {
      active.current = false;
      pending.forEach(task => { clearTimeout(task.timer); task.timer = undefined; });
    };
  }, [close]);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);
  return { api, items, host, remove, close };
}
