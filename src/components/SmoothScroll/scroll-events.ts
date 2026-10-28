const listeners = new Set<(y: number) => void>();
let frame = 0;
let pending = false;

// Нативные scroll приходят до rAF. Читаем положение в фазе кадра вместе с движком,
// а не заставляем браузер обновлять анимации посреди доставки каждого события.
export function flushWindowScroll() {
  if (!pending) return;
  pending = false;
  cancelAnimationFrame(frame);
  frame = 0;
  const y = window.scrollY;
  for (const listener of listeners) listener(y);
}

const dispatch = () => {
  pending = true;
  if (!frame) frame = requestAnimationFrame(flushWindowScroll);
};

export function subscribeWindowScroll(listener: (y: number) => void): () => void {
  const subscription = (y: number) => listener(y);
  if (!listeners.size) window.addEventListener('scroll', dispatch, { passive: true });
  listeners.add(subscription);
  return () => {
    listeners.delete(subscription);
    if (!listeners.size) {
      window.removeEventListener('scroll', dispatch);
      cancelAnimationFrame(frame);
      frame = 0;
      pending = false;
    }
  };
}
