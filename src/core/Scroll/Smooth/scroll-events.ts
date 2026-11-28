import type { ScrollView } from './viewport';

type ScrollListener = (y: number) => void;

function createScrollEvents(view: ScrollView, host?: HTMLElement) {
  const source: EventTarget = host ?? view;
  const listeners = new Set<ScrollListener>();
  let frame: number | null = null;

  // Deliver once per frame. The engine can flush before its own next write.
  const flush = () => {
    if (frame === null) return;
    view.cancelAnimationFrame(frame);
    frame = null;
    const position = host ? host.scrollTop : view.scrollY;
    for (const listener of listeners) listener(position);
  };

  const dispatch = () => {
    if (frame === null) frame = view.requestAnimationFrame(flush);
  };

  const subscribe = (listener: ScrollListener) => {
    const subscription = (y: number) => listener(y);
    if (!listeners.size) source.addEventListener('scroll', dispatch, { passive: true });
    listeners.add(subscription);
    return () => {
      listeners.delete(subscription);
      if (listeners.size) return;
      source.removeEventListener('scroll', dispatch);
      if (frame !== null) view.cancelAnimationFrame(frame);
      frame = null;
    };
  };

  return { subscribe, flush };
}

const scrollEvents = new WeakMap<ScrollView | HTMLElement, {
  view: ScrollView;
  events: ReturnType<typeof createScrollEvents>;
}>();

export function getScrollEvents(view: ScrollView, host?: HTMLElement) {
  const source = host ?? view;
  let entry = scrollEvents.get(source);
  if (entry?.view !== view) {
    entry = { view, events: createScrollEvents(view, host) };
    scrollEvents.set(source, entry);
  }
  return entry.events;
}

export function subscribeWindowScroll(listener: ScrollListener, view: ScrollView = window) {
  return getScrollEvents(view).subscribe(listener);
}
