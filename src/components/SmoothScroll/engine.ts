import { MEDIA_QUERY } from '../../core/base/breakpoints';
import {
  anchorTop,
  autoDurationMs,
  canScrollBy,
  clampScroll,
  hashTarget,
  isManualDrift,
  lerpStep,
  offsetCss,
  tweenPosition,
  wheelDeltaPx,
  type SmoothScrollEasing,
  type SmoothScrollOffset,
} from './smooth-scroll';

/** Атрибут-исключение: колесо над узлом с ним (и его потомками) и клик по ссылке внутри отдаются браузеру. */
export const SMOOTH_SCROLL_IGNORE = 'data-smooth-scroll-ignore';
// Модалки и слои, размеченные под Lenis, уже несут эти атрибуты — уважаем их, чтобы не размечать дважды.
const IGNORE_ATTRS = [SMOOTH_SCROLL_IGNORE, 'data-lenis-prevent', 'data-lenis-prevent-wheel'];
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab']);
const SCROLLABLE = /(auto|scroll|overlay)/;
// Вкладка в фоне копит время кадра; без потолка первый кадр после возврата прыгает к цели.
const MAX_FRAME_MS = 64;

export type SmoothScrollConfig = {
  lerp: number;
  wheelMultiplier: number;
  duration: number | undefined;
  easing: SmoothScrollEasing;
  offset: SmoothScrollOffset;
  mobile: boolean;
  anchors: boolean;
  updateHash: boolean;
};

/** Цель перелёта: позиция в px, элемент, `'#id'` или CSS-селектор. */
export type SmoothScrollTarget = number | Element | string;

export type SmoothScrollToOptions = {
  /** Сдвиг под шапку для этого вызова; по умолчанию — `offset` провайдера. К числовой цели не применяется. */
  offset?: SmoothScrollOffset;
  /** Длительность, секунды; по умолчанию — `duration` провайдера. */
  duration?: number;
  /** Функция хода для этого вызова. */
  easing?: SmoothScrollEasing;
  /** Без анимации — сразу на место. */
  immediate?: boolean;
};

export type SmoothScrollController = {
  scrollTo: (target: SmoothScrollTarget, options?: SmoothScrollToOptions) => void;
  stop: () => void;
  configure: (config: SmoothScrollConfig) => void;
  destroy: () => void;
};

type Tween = { from: number; resolve: () => number; start: number; durationMs: number; easing: SmoothScrollEasing };

function ignored(node: Element): boolean {
  return IGNORE_ATTRS.some((attr) => node.hasAttribute(attr));
}

/**
 * Движок плавной прокрутки окна. Позицию пишет в НАСТОЯЩИЙ скролл окна (`window.scrollTo`), а не
 * в `transform` обёртки: так живы `position: sticky`, поиск по странице, фокус, выделение и
 * `IntersectionObserver`. Цикл кадров крутится только пока есть ход — в покое движок стоит.
 */
export function createSmoothScroll(initial: SmoothScrollConfig): SmoothScrollController {
  let config = initial;
  let mode: 'idle' | 'wheel' | 'tween' = 'idle';
  let current = window.scrollY;
  let target = current;
  let written = current;
  let tween: Tween | null = null;
  let frame = 0;
  let last = 0;

  const reduced = window.matchMedia(MEDIA_QUERY.reducedMotion);
  const desktop = window.matchMedia(MEDIA_QUERY.desktop);
  const touch = window.matchMedia(MEDIA_QUERY.touch);

  const smooth = () => !reduced.matches && (config.mobile || (desktop.matches && !touch.matches));
  const maxScroll = () => (document.scrollingElement ?? document.documentElement).scrollHeight - window.innerHeight;

  const write = (y: number) => {
    written = y;
    window.scrollTo({ top: y, behavior: 'instant' });
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    mode = 'idle';
    tween = null;
  };

  const tick = (now: number) => {
    frame = 0;
    const dt = Math.min(now - last, MAX_FRAME_MS);
    last = now;

    // Окно уехало не нашей рукой — уступаем, а не тащим обратно.
    if (isManualDrift(window.scrollY, written)) return stop();

    const max = maxScroll();

    if (mode === 'wheel') {
      target = clampScroll(target, max);
      current = lerpStep(current, target, config.lerp, dt);
      write(current);
      if (current === target) return stop();
    } else if (tween) {
      // Цель пересчитывается каждый кадр: догрузилась картинка выше якоря — перелёт это учтёт.
      const step = tweenPosition(tween.from, clampScroll(tween.resolve(), max), now - tween.start, tween.durationMs, tween.easing);
      current = target = step.y;
      write(step.y);
      if (step.done) return stop();
    } else {
      return stop();
    }

    frame = requestAnimationFrame(tick);
  };

  const run = () => {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const measureOffset = (offset: SmoothScrollOffset): number => {
    if (typeof offset === 'number') return offset;
    if (typeof offset === 'function') return offset();

    // Переменную с `calc(var(--rpx) * N)` через getPropertyValue не прочесть — там сырой текст.
    // Меряем пробником: браузер сам посчитает длину на текущей ширине.
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:${offsetCss(offset)}`;
    document.body.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    probe.remove();

    return px;
  };

  const findElement = (selector: string): Element | null => {
    if (selector.startsWith('#')) return document.getElementById(selector.slice(1));
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  };

  const resolver = (to: SmoothScrollTarget, offset: SmoothScrollOffset): (() => number) | null => {
    if (typeof to === 'number') return () => to;

    const element = typeof to === 'string' ? findElement(to) : to;
    if (!element) return null;

    const px = measureOffset(offset);
    const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;

    return () => anchorTop(element.getBoundingClientRect().top, window.scrollY, px, margin);
  };

  const scrollTo = (to: SmoothScrollTarget, options: SmoothScrollToOptions = {}) => {
    const resolve = resolver(to, options.offset ?? config.offset);
    if (!resolve) return;

    stop();
    const top = clampScroll(resolve(), maxScroll());

    if (options.immediate || reduced.matches) {
      write(top);
      current = target = top;
      return;
    }

    // Тач и «не плавно» — ход ведёт браузер: он знает инерцию пальца лучше нас.
    if (!smooth()) {
      window.scrollTo({ top, behavior: 'smooth' });
      return;
    }

    const duration = options.duration ?? config.duration;
    current = target = written = window.scrollY;
    tween = {
      from: current,
      resolve,
      start: performance.now(),
      durationMs: duration === undefined ? autoDurationMs(top - current, window.innerHeight) : duration * 1000,
      easing: options.easing ?? config.easing,
    };
    mode = 'tween';
    run();
  };

  // Модалка открыта или страница заперта — колесо не наше, иначе прокрутим подложку.
  const pageLocked = (): boolean => {
    const locked = (node: Element) => /(hidden|clip)/.test(getComputedStyle(node).overflowY);
    if (locked(document.documentElement) || locked(document.body)) return true;

    return Array.from(document.querySelectorAll('[aria-modal="true"]')).some(
      (dialog) => !dialog.closest('[aria-hidden="true"]') && dialog.getClientRects().length > 0
    );
  };

  // Колесо над прокручиваемым контейнером, который ещё может ехать, — его. Упёрся — отдаёт окну,
  // как нативная цепочка; `overscroll-behavior` не `auto` цепочку запрещает — тогда не трогаем.
  const nativeWheel = (event: WheelEvent, delta: number): boolean => {
    for (const node of event.composedPath()) {
      if (!(node instanceof Element) || node === document.body || node === document.documentElement) continue;
      if (ignored(node)) return true;

      const style = getComputedStyle(node);
      if (!SCROLLABLE.test(style.overflowY) || node.scrollHeight <= node.clientHeight) continue;
      if (canScrollBy(node, delta) || style.overscrollBehaviorY !== 'auto') return true;
    }

    return false;
  };

  const onWheel = (event: WheelEvent) => {
    // Зум щипком приходит колесом с ctrlKey, Shift+колесо — горизонталь: всё это браузеру.
    if (event.defaultPrevented || event.ctrlKey || event.shiftKey || !smooth()) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    const delta = wheelDeltaPx(event.deltaY, event.deltaMode, window.innerHeight) * config.wheelMultiplier;
    if (!delta || nativeWheel(event, delta) || pageLocked()) return;

    event.preventDefault();

    if (mode !== 'wheel' || isManualDrift(window.scrollY, written)) {
      stop();
      current = target = written = window.scrollY;
    }

    target = clampScroll(target + delta, maxScroll());
    mode = 'wheel';
    run();
  };

  const interrupt = () => {
    if (mode !== 'idle') stop();
  };

  const onKey = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) interrupt();
  };

  const focusTarget = (element: Element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus({ preventScroll: true });
  };

  // Ловим на window в фазе захвата — раньше роутера: `next/link` видит defaultPrevented и не
  // уводит страницу в свой переход с мгновенным прыжком.
  const onClick = (event: MouseEvent) => {
    if (!config.anchors || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    if (link.closest(IGNORE_ATTRS.map((attr) => `[${attr}]`).join(','))) return;

    const id = hashTarget(link.href, window.location.href);
    if (id === null) return;

    // `#top` без такого id — верх страницы, как в спецификации HTML.
    const element = document.getElementById(id);
    if (!element && id !== 'top') return;

    event.preventDefault();
    scrollTo(element ?? 0);

    if (config.updateHash && link.href !== window.location.href) window.history.pushState(null, '', link.href);
    // Нажатие с клавиатуры (detail 0) переносит фокус к цели, как нативный якорь: следующий Tab
    // идёт от раздела, а не от ссылки. Мышью фокус не трогаем — лишнее кольцо на секции.
    if (element && event.detail === 0) focusTarget(element);
  };

  const onReducedChange = () => {
    if (reduced.matches) stop();
  };

  // Загрузка с `#hash`: браузер уже прыгнул без учёта шапки — ставим на место. Перезагрузку и
  // «назад» не трогаем: там браузер восстанавливает позицию, где человек был.
  const navigation = performance.getEntriesByType('navigation')[0];
  const restored = navigation instanceof PerformanceNavigationTiming && navigation.type !== 'navigate';
  const hashId = config.anchors && !restored ? hashTarget(window.location.hash, window.location.href) : null;
  let hashFrame = 0;

  const alignHash = () => {
    if (hashId === null || isManualDrift(window.scrollY, written)) return;
    const element = document.getElementById(hashId);
    if (element) scrollTo(element, { immediate: true });
  };

  const onLoad = () => alignHash();

  if (hashId !== null) {
    hashFrame = requestAnimationFrame(() => {
      written = window.scrollY;
      alignHash();
    });
    // Картинки выше якоря догружаются после гидрации и сдвигают его — поправка ещё раз на load,
    // если человек за это время не прокрутил сам.
    if (document.readyState !== 'complete') window.addEventListener('load', onLoad, { once: true });
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', interrupt, { passive: true });
  window.addEventListener('touchstart', interrupt, { passive: true });
  reduced.addEventListener('change', onReducedChange);

  return {
    scrollTo,
    stop,
    configure: (next) => {
      config = next;
    },
    destroy: () => {
      stop();
      cancelAnimationFrame(hashFrame);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('load', onLoad);
      reduced.removeEventListener('change', onReducedChange);
    },
  };
}
