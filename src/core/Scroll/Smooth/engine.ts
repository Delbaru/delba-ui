import { MEDIA_QUERY } from '../../base/breakpoints';
import {
  autoDurationMs, canScrollBy, clampScroll, hashTarget, isManualDrift, lerpStep, tweenPosition, wheelDeltaPx,
  type SmoothScrollEasing,
} from './smooth-scroll';
import type { SmoothScrollConfig, SmoothScrollTarget, SmoothScrollToOptions } from './types';
import type { SmoothViewport } from './viewport';

export const SMOOTH_SCROLL_IGNORE = 'data-smooth-scroll-ignore';
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab']);
const SCROLLABLE = /^(auto|scroll|overlay)$/;
const MAX_FRAME_MS = 64;

type Tween = {
  from: number;
  resolve: () => number | null;
  start: number;
  durationMs: number;
  easing: SmoothScrollEasing;
};

const owners = new WeakMap<EventTarget, (id: string) => Element | number | null>();

/** Writes native scroll positions, so sticky elements, focus and find-in-page use the actual viewport. */
export function createSmoothScroll(viewport: SmoothViewport, initial: SmoothScrollConfig) {
  const { document, view, host, source, events, position } = viewport;
  if (owners.has(source)) {
    throw new Error(`Only one Flex with a smooth scroll preset may own this ${host ? 'container' : 'window'}`);
  }

  let config = initial;
  let mode: 'idle' | 'wheel' | 'tween' = 'idle';
  let current = position();
  let target = current;
  let written = current;
  let tween: Tween | null = null;
  let nativeTarget: number | null = null;
  let frame: number | null = null;
  let last = 0;
  let destroyed = false;

  const reduced = view.matchMedia(MEDIA_QUERY.reducedMotion);
  const desktop = view.matchMedia(MEDIA_QUERY.desktop);
  const touch = view.matchMedia(MEDIA_QUERY.touch);
  const smooth = () => !reduced.matches && (config.mobile || (desktop.matches && !touch.matches));

  let maximum = viewport.maximum();
  const measure = () => { maximum = viewport.maximum(); };
  const unobserve = viewport.observe(measure);

  const write = (y: number) => {
    written = y;
    viewport.write(y);
  };

  const stop = () => {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    mode = 'idle';
    tween = null;
    if (nativeTarget !== null) {
      nativeTarget = null;
      write(position());
    }
  };

  const tick = (now: number) => {
    frame = null;
    // A fixed-height Flex can gain overflow without a resize on the host.
    if (host) measure();
    events.flush();
    if (frame !== null) return; // A subscriber started a new flight during delivery.
    if (mode === 'idle' || isManualDrift(position(), clampScroll(written, maximum)) || !smooth()) return stop();

    const dt = Math.min(now - last, MAX_FRAME_MS);
    last = now;
    if (mode === 'wheel') {
      target = clampScroll(target, maximum);
      current = lerpStep(clampScroll(current, maximum), target, config.lerp, dt);
      write(current);
      if (current === target) return stop();
    } else if (tween) {
      const activeTween = tween;
      // Images or expanding content can move the anchor before the next frame.
      const destination = activeTween.resolve();
      if (destination === null) return stop();
      const step = tweenPosition(activeTween.from, clampScroll(destination, maximum),
        now - activeTween.start, activeTween.durationMs, activeTween.easing);
      if (tween !== activeTween) return; // A custom easing can stop or replace the flight.
      current = target = clampScroll(step.y, maximum);
      write(current);
      if (step.done) return stop();
    }
    frame = view.requestAnimationFrame(tick);
  };

  const run = () => {
    if (frame !== null) return;
    last = view.performance.now();
    frame = view.requestAnimationFrame(tick);
  };

  const resolveTarget = (target: SmoothScrollTarget, options: SmoothScrollToOptions) =>
    viewport.resolve(target, options.offset ?? config.offset, options.block ?? 'start');

  const getTargetTop = (target: SmoothScrollTarget, options: SmoothScrollToOptions = {}) => {
    const top = resolveTarget(target, options)?.();
    return top == null ? null : clampScroll(top, viewport.maximum());
  };

  const scrollTo = (to: SmoothScrollTarget, options: SmoothScrollToOptions = {}) => {
    if (destroyed) return;
    const resolve = resolveTarget(to, options);
    const destination = resolve?.();
    if (!resolve || destination == null) return;

    stop();
    measure();
    const top = clampScroll(destination, maximum);
    if (options.immediate || reduced.matches) {
      write(top);
      return;
    }

    if (!smooth()) {
      if (top === position()) return;
      nativeTarget = top;
      viewport.write(top, 'smooth');
      return;
    }

    const duration = options.duration ?? config.duration;
    current = target = written = position();
    if (duration === 0 || top === current) {
      write(top);
      return;
    }

    tween = {
      from: current,
      resolve,
      start: view.performance.now(),
      durationMs: duration === undefined ? autoDurationMs(top - current, viewport.height()) : duration * 1000,
      easing: options.easing ?? config.easing,
    };
    mode = 'tween';
    run();
  };

  const windowLocked = () => {
    const locked = (element: Element | null) =>
      Boolean(element && /^(hidden|clip)$/.test(view.getComputedStyle(element).overflowY));
    if (locked(document.documentElement) || locked(document.body)) return true;
    return Array.from(document.querySelectorAll('[aria-modal="true"]')).some(
      dialog => !dialog.closest('[aria-hidden="true"]') && dialog.getClientRects().length > 0,
    );
  };

  const nativeWheel = (path: EventTarget[], delta: number) => {
    for (const node of path) {
      if (!(node instanceof view.Element)) continue;
      if (node === host) break;
      if (node === document.body || node === document.documentElement) continue;

      const style = view.getComputedStyle(node);
      if (SCROLLABLE.test(style.overflowY) && node.scrollHeight > node.clientHeight &&
        (canScrollBy(node, delta) || (style.overscrollBehaviorY && style.overscrollBehaviorY !== 'auto'))) {
        return true;
      }
    }
    return false;
  };

  const ignored = (path: EventTarget[]) =>
    path.some(node => node instanceof view.Element && node.hasAttribute(SMOOTH_SCROLL_IGNORE));

  const onWheel = (rawEvent: Event) => {
    const event = rawEvent as WheelEvent;
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (event.defaultPrevented || !event.cancelable || !smooth()) return stop();

    const delta = wheelDeltaPx(event.deltaY, event.deltaMode, viewport.height()) * config.wheelMultiplier;
    if (!delta) return;
    const path = event.composedPath();
    if (ignored(path) || nativeWheel(path, delta) || (!host && windowLocked())) return stop();

    measure();
    const actual = position();
    // The native chain can continue to the parent only after we reach the edge.
    if (actual === clampScroll(actual + delta, maximum)) return stop();

    event.preventDefault();
    if (mode !== 'wheel' || isManualDrift(actual, written)) {
      stop();
      current = target = written = actual;
    }
    target = clampScroll(target + delta, maximum);
    mode = 'wheel';
    run();
  };

  const unsubscribeScroll = events.subscribe(y => {
    if (nativeTarget !== null && Math.abs(y - nativeTarget) < 1) nativeTarget = null;
    if (mode !== 'idle' && isManualDrift(y, clampScroll(written, maximum))) stop();
  });

  const scrollEndSource: EventTarget = host ?? document;
  const onScrollEnd = (event: Event) => {
    if (event.target === scrollEndSource) nativeTarget = null;
  };

  const onKey = (rawEvent: Event) => {
    if (SCROLL_KEYS.has((rawEvent as KeyboardEvent).key)) stop();
  };

  const anchor = (id: string) => config.anchors
    ? viewport.findAnchor(id) ?? (!host && id === 'top' ? 0 : null)
    : null;

  // Capture before the router. The innermost qualifying viewport owns the link.
  const onClick = (rawEvent: Event) => {
    const event = rawEvent as MouseEvent;
    if (!config.anchors || event.defaultPrevented || !event.cancelable || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const path = event.composedPath();
    if (ignored(path)) return;
    const link = path.find(node => node instanceof view.HTMLAnchorElement && node.hasAttribute('href'));
    if (!(link instanceof view.HTMLAnchorElement) ||
      (link.target && link.target !== '_self') || link.hasAttribute('download')) return;

    const id = hashTarget(link.href, view.location.href);
    if (id === null) return;
    for (const node of path) {
      const destination = owners.get(node)?.(id);
      if (destination == null) continue;
      if (node !== source) return;

      event.preventDefault();
      scrollTo(destination);
      if (config.updateHash && link.href !== view.location.href) view.history.pushState(null, '', link.href);
      if (event.detail === 0 && destination instanceof view.HTMLElement) {
        if (destination.tabIndex < 0 && !destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
      }
      return;
    }
  };

  const onMotionChange = () => {
    if (reduced.matches || (mode !== 'idle' && !smooth())) stop();
  };

  // On initial document navigation, correct the browser's hash jump for the configured offset.
  const navigation = view.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const hashId = !host && config.anchors && (!navigation || navigation.type === 'navigate')
    ? hashTarget(view.location.hash, view.location.href)
    : null;
  let hashFrame: number | null = null;
  const alignHash = () => {
    if (hashId === null || !config.anchors || isManualDrift(position(), written)) return;
    const element = viewport.findAnchor(hashId);
    if (element) scrollTo(element, { immediate: true });
  };

  if (hashId !== null) {
    hashFrame = view.requestAnimationFrame(() => {
      hashFrame = null;
      written = position();
      alignHash();
    });
    if (document.readyState !== 'complete') view.addEventListener('load', alignHash, { once: true });
  }

  source.addEventListener('wheel', onWheel, { passive: false });
  source.addEventListener('click', onClick, true);
  source.addEventListener('keydown', onKey);
  source.addEventListener('pointerdown', stop, { passive: true });
  source.addEventListener('touchstart', stop, { passive: true });
  scrollEndSource.addEventListener('scrollend', onScrollEnd);
  const media = [reduced, desktop, touch];
  for (const query of media) query.addEventListener('change', onMotionChange);
  owners.set(source, anchor);

  return {
    scrollTo,
    getTargetTop,
    isMoving: () => nativeTarget === null ? mode !== 'idle' : undefined,
    stop,
    configure(next: SmoothScrollConfig) {
      config = next;
      onMotionChange();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      unobserve();
      unsubscribeScroll();
      if (hashFrame !== null) view.cancelAnimationFrame(hashFrame);
      source.removeEventListener('wheel', onWheel);
      source.removeEventListener('click', onClick, true);
      source.removeEventListener('keydown', onKey);
      source.removeEventListener('pointerdown', stop);
      source.removeEventListener('touchstart', stop);
      scrollEndSource.removeEventListener('scrollend', onScrollEnd);
      view.removeEventListener('load', alignHash);
      for (const query of media) query.removeEventListener('change', onMotionChange);
      owners.delete(source);
    },
  };
}
