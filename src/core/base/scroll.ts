import { prefersReducedMotion } from './motion';

/** Цель прокрутки: узел, объектный `ref` на него или якорь — `'#id'` либо голый `id`. */
export type ScrollTarget = Element | null | undefined | { readonly current: Element | null } | string;

/** Итог движения: доехало или было прервано. */
export type ScrollResult = { status: 'finished' | 'interrupted' };

export interface ScrollToOptions {
  /** Scroll only this viewport (Element/ref/selector); the document and its provider stay still. */
  container?: ScrollTarget;
  /** Положение цели в окне: `'start'` (по умолчанию), `'center'`, `'end'` или `'nearest'`. */
  block?: ScrollLogicalPosition;
  /**
   * Сдвиг конечной позиции у smooth-поверхности; `scroll-margin-top` цели заменяет его.
   * Без провайдера отступ делает только `scroll-margin-top` цели — число в JS прокрутка не берёт.
   */
  offset?: number | string | (() => number);
}

type ProviderScrollOptions = { offset?: number | string | (() => number); block?: ScrollLogicalPosition };

export type ScrollProviderApi = {
  scrollTo(target: Element | string | number, options?: ProviderScrollOptions): void;
  stop?(): void;
  isMoving?(): boolean | undefined;
  getTargetTop?(target: Element | string | number, options?: ProviderScrollOptions): number | null;
};

/** Сколько кадров подряд положение цели и высота документа должны стоять, прежде чем ехать. */
export const SETTLED_FRAMES = 6;
/** Сколько ждать устаканивания раскладки, мс: дольше — едем по тому, что есть. */
export const SETTLE_TIMEOUT_MS = 1200;

/** Якорь без решётки: `'#question-1'` и `'question-1'` — один id. */
export function anchorId(anchor: string): string {
  return anchor.startsWith('#') ? anchor.slice(1) : anchor;
}

/** Узел цели: `ref` и якорь разворачиваются, пустое значение — `null`. */
export function resolveScrollTarget(target: ScrollTarget, owner?: Document): Element | null {
  if (!target) return null;

  if (typeof target === 'string') return (owner ?? (typeof document === 'undefined' ? undefined : document))?.getElementById(anchorId(target)) ?? null;

  return 'current' in target ? target.current : target;
}

/**
 * Подпись раскладки: где стоит цель и какой высоты документ. Меняется, пока соседи раскрываются
 * или догружается контент, — ехать в этот момент бесполезно, приедешь мимо.
 */
export function layoutSignature(element: Element): string {
  return `${Math.round(element.getBoundingClientRect().top + window.scrollY)}:${document.documentElement.scrollHeight}`;
}

/** Счёт устоявшихся кадров: копится только у существующей цели на неизменном месте. */
export function nextStableFrames(hasElement: boolean, positionUnchanged: boolean, stableFrames: number): number {
  return hasElement && positionUnchanged ? stableFrames + 1 : 0;
}

/** Пора стартовать: раскладка устоялась или отведённое на устаканивание время вышло. */
export function settledForLaunch(hasElement: boolean, stableFrames: number, elapsedMs: number): boolean {
  return hasElement && (stableFrames >= SETTLED_FRAMES || elapsedMs > SETTLE_TIMEOUT_MS);
}

/** Цель так и не появилась и не устоялась вдвое дольше отведённого — ехать не к чему. */
export function gaveUpWaiting(elapsedMs: number): boolean {
  return elapsedMs > SETTLE_TIMEOUT_MS * 2;
}

type ScrollRun = { cancel(): void };

let active: ScrollRun | null = null;
let provider: ScrollProviderApi | null = null;
const containerRuns = new WeakMap<Element, ScrollRun>();
const containerProviders = new WeakMap<Element, ScrollProviderApi>();

function scrollWithin(element: Element | null, viewport: Element | null, options: ScrollToOptions): Promise<ScrollResult> {
    const view = viewport?.ownerDocument.defaultView;
    if (!element || !viewport || !view || !viewport.contains(element)) return Promise.resolve({ status: 'interrupted' });
    containerRuns.get(viewport)?.cancel();
    const api = containerProviders.get(viewport);
    const block = options.block ?? 'start';
    const bounds = viewport.getBoundingClientRect();
    const target = element.getBoundingClientRect();
    const start = bounds.top + viewport.clientTop;
    const end = start + viewport.clientHeight;
    const above = target.top - start;
    const below = target.bottom - end;
    let delta = block === 'center' ? (above + below) / 2 : block === 'end' ? below : above;
    if (block === 'nearest') {
        if ((above >= 0 && below <= 0) || (above <= 0 && below >= 0)) delta = 0;
        else delta = above < 0 ? above : below;
    }
    const top = Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight, viewport.scrollTop + delta));
    const alignment = { block, offset: options.offset };
    if (!api && Math.abs(top - viewport.scrollTop) < 1) return Promise.resolve({ status: 'finished' });
    return new Promise(resolve => {
        let frame = 0;
        let stable = 0;
        let moved = false;
        let finished = false;
        let previous = viewport.scrollTop;
        const started = view.performance.now();
        const finish = (status: ScrollResult['status']) => {
            if (finished) return;
            finished = true;
            view.cancelAnimationFrame(frame);
            if (containerRuns.get(viewport) === run) containerRuns.delete(viewport);
            resolve({ status });
        };
        const run: ScrollRun = { cancel: () => {
            api?.stop?.();
            if (!api) viewport.scrollTo({ top: viewport.scrollTop, behavior: 'instant' });
            finish('interrupted');
        } };
        containerRuns.set(viewport, run);
        if (api) api.scrollTo(element, alignment);
        else viewport.scrollTo({ top, behavior: prefersReducedMotion(view) ? 'instant' : 'smooth' });
        const tick = () => {
            if (!viewport.isConnected || !viewport.contains(element)) { api?.stop?.(); finish('interrupted'); return; }
            const position = viewport.scrollTop;
            moved ||= Math.abs(position - previous) >= 0.5;
            stable = Math.abs(position - previous) < 0.5 ? stable + 1 : 0;
            previous = position;
            const elapsed = view.performance.now() - started;
            const moving = api?.isMoving?.();
            if (stable >= REST_FRAMES && moving !== true) {
                const expected = api?.getTargetTop ? api.getTargetTop(element, alignment) : api ? null : top;
                if (api?.getTargetTop && expected === null) { api.stop?.(); finish('interrupted'); return; }
                const atTarget = expected === null ? moved || elapsed > REST_TIMEOUT_MS : Math.abs(position - expected) < 1;
                if (atTarget) { finish('finished'); return; }
                if (moving === false) { finish('interrupted'); return; }
            }
            if (moving == null && elapsed > SETTLE_TIMEOUT_MS * 2) { api?.stop?.(); finish('interrupted'); return; }
            frame = view.requestAnimationFrame(tick);
        };
        frame = view.requestAnimationFrame(tick);
    });
}

/** Провайдер отдаёт себя двери ядра: вызывает один раз при монтировании, при размонтировании снимает. */
export function registerScrollProvider(api: ScrollProviderApi, viewport?: Element): void {
  if (viewport) containerProviders.set(viewport, api);
  else provider = api;
}

/** Снимает только свою регистрацию: смонтировавшийся позже провайдер не затирается уходом прежнего. */
export function unregisterScrollProvider(api: ScrollProviderApi, viewport?: Element): void {
  if (viewport) {
    if (containerProviders.get(viewport) !== api) return;
    containerRuns.get(viewport)?.cancel();
    containerProviders.delete(viewport);
  } else if (provider === api) {
    cancelActiveScroll();
    provider = null;
  }
}

export function cancelActiveScroll(): void {
  const previous = active;
  active = null;
  previous?.cancel();
}

/** Сколько кадров подряд позиция окна стоит, чтобы ход считать доехавшим. */
const REST_FRAMES = 6;
/** Если за столько мс окно не сдвинулось, хода и не было — мы уже на месте. */
const REST_TIMEOUT_MS = 300;

function waitForScrollRest(resolve: (result: ScrollResult) => void, api?: ScrollProviderApi, target?: Element, options?: ScrollToOptions): void {
  const startedAt = performance.now();
  let cancelled = false;
  let frame = 0;
  let lastY = window.scrollY;
  let moved = false;
  let restFrames = 0;

  active = {
    cancel: () => {
      cancelled = true;
      api?.stop?.();
      if (!api) window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' });
      window.cancelAnimationFrame(frame);
      resolve({ status: 'interrupted' });
    },
  };

  const tick = () => {
    if (cancelled) return;

    if (target && !target.isConnected) {
      active = null;
      api?.stop?.();
      resolve({ status: 'interrupted' });
      return;
    }

    const y = window.scrollY;

    moved = moved || y !== lastY;
    restFrames = y === lastY ? restFrames + 1 : 0;
    lastY = y;

    if (!api?.isMoving?.() && restFrames >= REST_FRAMES && (moved || performance.now() - startedAt > REST_TIMEOUT_MS)) {
      active = null;
      const expected = target ? api?.getTargetTop?.(target, options) : undefined;
      resolve({ status: expected === null || typeof expected === 'number' && Math.abs(y - expected) >= 1 ? 'interrupted' : 'finished' });
      return;
    }

    frame = window.requestAnimationFrame(tick);
  };

  frame = window.requestAnimationFrame(tick);
}

function launchFlight(element: Element, options: ScrollToOptions, resolve: (result: ScrollResult) => void): void {
  const api = provider;

  if (api) {
    const alignment = options.offset !== undefined || options.block !== undefined
      ? { offset: options.offset, block: options.block }
      : undefined;
    api.scrollTo(element, alignment);
  } else {
    // Нативный ход ведёт браузер; отступ под шапку берётся из `scroll-margin-top` цели.
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: options.block ?? 'start',
    });
  }

  waitForScrollRest(resolve, api ?? undefined, element, options);
}

/** Wait for a stable layout, then scroll through the surface's engine or native scrolling. */
export function scrollTo(target: ScrollTarget, options: ScrollToOptions = {}): Promise<ScrollResult> {
  if (typeof document === 'undefined') return Promise.resolve<ScrollResult>({ status: 'interrupted' });
  if (options.container !== undefined) {
    const viewport = resolveScrollTarget(options.container);
    return scrollWithin(resolveScrollTarget(target, viewport?.ownerDocument), viewport, options);
  }

  cancelActiveScroll();

  return new Promise<ScrollResult>((resolve) => {
    const startedAt = performance.now();
    let cancelled = false;
    let frame = 0;
    let lastSignature = '';
    let stableFrames = 0;

    active = {
      cancel: () => {
        cancelled = true;
        window.cancelAnimationFrame(frame);
        resolve({ status: 'interrupted' });
      },
    };

    const tick = () => {
      if (cancelled) return;

      const element = resolveScrollTarget(target);
      const signature = element ? layoutSignature(element) : '';
      stableFrames = nextStableFrames(element !== null, signature === lastSignature, stableFrames);
      lastSignature = signature;

      const elapsedMs = performance.now() - startedAt;

      if (element && settledForLaunch(true, stableFrames, elapsedMs)) {
        launchFlight(element, options, resolve);
        return;
      }

      if (gaveUpWaiting(elapsedMs)) {
        active = null;
        resolve({ status: 'interrupted' });
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
  });
}
