import { prefersReducedMotion } from './motion';

/** Цель прокрутки: узел, объектный `ref` на него или якорь — `'#id'` либо голый `id`. */
export type ScrollTarget = Element | null | undefined | { readonly current: Element | null } | string;

/** Итог движения: доехало или уступило новой прокрутке. Когда в ките появится `Transition`, станет им. */
export type ScrollResult = { status: 'finished' | 'interrupted' };

export interface ScrollToOptions {
  /** Положение цели в окне: `'start'` (по умолчанию), `'center'`, `'end'` или `'nearest'`. */
  block?: ScrollLogicalPosition;
  /**
   * Сдвиг конечной позиции под провайдеру `SmoothScroll`; `scroll-margin-top` цели ЗАМЕНЯЕТ его.
   * Без провайдера отступ делает только `scroll-margin-top` цели — число в JS прокрутка не берёт.
   */
  offset?: number | string | (() => number);
}

/** Что дверь ядра берёт у провайдера плавной прокрутки; в точности умеет `SmoothScroll`. */
export type ScrollProviderApi = {
  scrollTo: (target: Element | string | number, options?: { offset?: number | string | (() => number) }) => void;
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
export function resolveScrollTarget(target: ScrollTarget): Element | null {
  if (!target) return null;

  if (typeof target === 'string') return document.getElementById(anchorId(target));

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

/** Провайдер отдаёт себя двери ядра: вызывает один раз при монтировании, при размонтировании снимает. */
export function registerScrollProvider(api: ScrollProviderApi): void {
  provider = api;
}

/** Снимает только свою регистрацию: смонтировавшийся позже провайдер не затирается уходом прежнего. */
export function unregisterScrollProvider(api: ScrollProviderApi): void {
  if (provider === api) provider = null;
}

function cancelActiveScroll(): void {
  const previous = active;
  active = null;
  previous?.cancel();
}

/** Сколько кадров подряд позиция окна стоит, чтобы ход считать доехавшим. */
const REST_FRAMES = 6;
/** Если за столько мс окно не сдвинулось, хода и не было — мы уже на месте. */
const REST_TIMEOUT_MS = 300;

function waitForScrollRest(resolve: (result: ScrollResult) => void): void {
  const startedAt = performance.now();
  let cancelled = false;
  let frame = 0;
  let lastY = window.scrollY;
  let moved = false;
  let restFrames = 0;

  active = {
    cancel: () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      resolve({ status: 'interrupted' });
    },
  };

  const tick = () => {
    if (cancelled) return;

    const y = window.scrollY;

    moved = moved || y !== lastY;
    restFrames = y === lastY ? restFrames + 1 : 0;
    lastY = y;

    if (restFrames >= REST_FRAMES && (moved || performance.now() - startedAt > REST_TIMEOUT_MS)) {
      active = null;
      resolve({ status: 'finished' });
      return;
    }

    frame = window.requestAnimationFrame(tick);
  };

  frame = window.requestAnimationFrame(tick);
}

function launchFlight(element: Element, options: ScrollToOptions, resolve: (result: ScrollResult) => void): void {
  const api = provider;

  if (api) {
    api.scrollTo(element, options.offset === undefined ? undefined : { offset: options.offset });
  } else {
    // Нативный ход ведёт браузер; отступ под шапку берётся из `scroll-margin-top` цели.
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: options.block ?? 'start',
    });
  }

  waitForScrollRest(resolve);
}

/**
 * Прокрутка окна к цели, которая ДОЕЗЖАЕТ. Обычный `scrollIntoView` посреди чужих раскрытий и
 * догрузок стартует по устаревшим координатам и не доезжает (ревью 7), поэтому старт откладывается,
 * пока раскладка встанет: положение цели и высота документа неизменны `SETTLED_FRAMES` кадров.
 *
 * Одна прокрутка за раз: новая прерывает недоехавшую — её обещание даёт `{ status: 'interrupted' }`.
 * Ход строится на провайдере `SmoothScroll` (`registerScrollProvider`), без него — нативная
 * плавная прокрутка окна. Отступ под шапку — CSS `scroll-margin-top` у цели, не число в JS.
 */
export function scrollTo(target: ScrollTarget, options: ScrollToOptions = {}): Promise<ScrollResult> {
  if (typeof document === 'undefined') return Promise.resolve<ScrollResult>({ status: 'interrupted' });

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
