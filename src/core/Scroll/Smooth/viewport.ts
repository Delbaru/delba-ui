import { getScrollEvents } from './scroll-events';
import { alignedScrollTop, offsetCss, type SmoothScrollOffset } from './smooth-scroll';

export type ScrollView = NonNullable<Document['defaultView']>;

export function createSmoothViewport(document: Document, host?: HTMLElement) {
  const view = document.defaultView;
  if (!view) return null;

  const source: EventTarget = host ?? view;
  const events = getScrollEvents(view, host);
  const height = () => host ? host.clientHeight : view.innerHeight;
  const position = () => host ? host.scrollTop : view.scrollY;
  const maximum = () => Math.max(0,
    (host ?? document.scrollingElement ?? document.documentElement).scrollHeight - height());
  const write = (top: number, behavior: ScrollBehavior = 'instant') =>
    (host ?? view).scrollTo({ top, behavior });

  const observe = (measure: () => void) => {
    const resize = new view.ResizeObserver(measure);
    if (host) resize.observe(host);
    else {
      resize.observe(document.documentElement);
      if (document.body) resize.observe(document.body);
    }
    view.addEventListener('resize', measure);
    return () => {
      resize.disconnect();
      view.removeEventListener('resize', measure);
    };
  };

  const contains = (element: Element) => host
    ? host !== element && host.contains(element)
    : element.ownerDocument === document && element.isConnected;

  const findAnchor = (id: string) => {
    if (!host) return document.getElementById(id);
    if (!id) return null;
    return host.querySelector(`#${view.CSS.escape(id)}`);
  };

  const findElement = (selector: string) => {
    if (selector.startsWith('#')) {
      const anchor = findAnchor(selector.slice(1));
      if (anchor) return anchor;
    }
    try {
      return (host ?? document).querySelector(selector);
    } catch {
      return null;
    }
  };

  const measureOffset = (offset: SmoothScrollOffset): number => {
    if (typeof offset === 'number') return offset;
    if (typeof offset === 'function') return offset();
    const scope = host ?? document.body;
    if (!scope) return 0;

    // Read the computed CSS length in the scroll surface's variable scope.
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;top:0;left:0;width:0;visibility:hidden;pointer-events:none';
    probe.style.height = offsetCss(offset);
    scope.append(probe);
    try {
      return probe.getBoundingClientRect().height;
    } finally {
      probe.remove();
    }
  };

  const resolve = (target: number | Element | string, offset: SmoothScrollOffset, block: ScrollLogicalPosition) => {
    if (typeof target === 'number') return () => target;
    const element = typeof target === 'string' ? findElement(target) : target;
    if (!element || !contains(element)) return null;

    const pixels = measureOffset(offset);
    const style = view.getComputedStyle(element);
    const margin = { top: parseFloat(style.scrollMarginTop) || 0, bottom: parseFloat(style.scrollMarginBottom) || 0 };
    return () => {
      if (!contains(element)) return null;
      const top = host ? host.getBoundingClientRect().top + host.clientTop : 0;
      return alignedScrollTop(element.getBoundingClientRect(), { top, height: height(), y: position() }, pixels, margin, block);
    };
  };

  return { document, view, host, source, events, height, position, maximum, write, observe, findAnchor, resolve };
}

export type SmoothViewport = NonNullable<ReturnType<typeof createSmoothViewport>>;
