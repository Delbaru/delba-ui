const listeners = new Set<(y: number) => void>();

// Даже scrollY может flush-ить layout. Один нативный снимок до работы подписчиков.
const dispatch = () => {
  const y = window.scrollY;
  for (const listener of listeners) listener(y);
};

export function subscribeWindowScroll(listener: (y: number) => void): () => void {
  const subscription = (y: number) => listener(y);
  if (!listeners.size) window.addEventListener('scroll', dispatch, { passive: true });
  listeners.add(subscription);
  return () => {
    listeners.delete(subscription);
    if (!listeners.size) window.removeEventListener('scroll', dispatch);
  };
}
