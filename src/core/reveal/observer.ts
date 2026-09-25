import { MOTION_END_BUFFER_MS, prefersReducedMotion, readMotionMs } from '../base/motion';
import { revealDelays, revealObserverKey, type ResolvedReveal } from './reveal';

// Состояние цели — атрибутом, а не классом React: его пишет наблюдатель, рендер о нём не знает.
// нет → до гидрации (прячет страховочная анимация `ui-reveal-hold`), wait → ждёт экрана,
// in → идёт ход, done → доехал: анимация и will-change сняты, узел снова живёт своими стилями.
const STATE = 'data-reveal-state';
const HOLD = 'ui-reveal-hold';

type Target = { host: HTMLElement; config: ResolvedReveal };

const observers = new Map<string, IntersectionObserver>();
const targets = new Map<Element, Target>();
const hosts = new Map<HTMLElement, { own: Set<Element>; mutations: MutationObserver | null }>();
const timers = new Map<Element, ReturnType<typeof setTimeout>>();

const setState = (el: Element, state: 'wait' | 'in' | 'done') => el.setAttribute(STATE, state);

function clearTimer(el: Element) {
  const timer = timers.get(el);
  if (timer === undefined) return;
  clearTimeout(timer);
  timers.delete(el);
}

// Страховка без JS кончилась раньше, чем пришёл JS (медленная гидрация): элемент уже виден, и
// прятать его заново — то самое «видно → пропало → видно». Нет getAnimations — считаем, что идёт.
function holdExpired(el: Element): boolean {
  if (typeof el.getAnimations !== 'function') return false;
  return !el.getAnimations().some((a) => a instanceof CSSAnimation && a.animationName === HOLD);
}

function onScreen(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

function play(batch: Element[], config: ResolvedReveal, stagger: boolean) {
  const delays = revealDelays(batch.length, config);
  batch.forEach((el, index) => {
    if (stagger && el instanceof HTMLElement) el.style.setProperty('--reveal-delay', `${delays[index] ?? 0}ms`);
    clearTimer(el);
    setState(el, 'in');
  });
  // Длительность читается после записи состояния: так в неё входят и токен темы, и задержка каскада.
  batch.forEach((el) => {
    const ms = el instanceof HTMLElement ? readMotionMs(el, 'animation') : 0;
    timers.set(el, setTimeout(() => {
      timers.delete(el);
      if (el.getAttribute(STATE) === 'in') setState(el, 'done');
    }, ms + MOTION_END_BUFFER_MS));
  });
}

function onEntries(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
  const batches = new Map<HTMLElement, { config: ResolvedReveal; items: Element[] }>();

  for (const entry of entries) {
    const el = entry.target;
    const target = targets.get(el);
    if (!target) continue;
    const state = el.getAttribute(STATE);

    if (entry.isIntersecting) {
      if (state !== 'wait') continue;
      const batch = batches.get(target.host) ?? { config: target.config, items: [] };
      batch.items.push(el);
      batches.set(target.host, batch);
      if (target.config.once) observer.unobserve(el);
    } else if (state === 'wait' && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0)) {
      // Выше экрана (перезагрузка посреди страницы, прыжок по якорю) — встаёт на место без хода.
      setState(el, 'done');
      if (target.config.once) observer.unobserve(el);
    } else if (!target.config.once && state !== 'wait') {
      clearTimer(el);
      setState(el, 'wait');
    }
  }

  batches.forEach(({ config, items }) => {
    items.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    play(items, config, config.stagger > 0);
  });
}

function observerFor(config: ResolvedReveal): IntersectionObserver {
  const key = revealObserverKey(config);
  let observer = observers.get(key);
  if (!observer) {
    observer = new IntersectionObserver(onEntries, { threshold: config.threshold, rootMargin: config.rootMargin });
    observers.set(key, observer);
  }
  return observer;
}

function arm(el: Element, host: HTMLElement, config: ResolvedReveal) {
  targets.set(el, { host, config });
  hosts.get(host)?.own.add(el);
  const state = el.getAttribute(STATE);

  if (state === 'in' || state === 'done') {
    if (!config.once) observerFor(config).observe(el);
    return;
  }
  if (!state && holdExpired(el) && onScreen(el)) {
    setState(el, 'done');
    if (!config.once) observerFor(config).observe(el);
    return;
  }
  if (!state) setState(el, 'wait');
  observerFor(config).observe(el);
}

function release(el: Element, config: ResolvedReveal) {
  observers.get(revealObserverKey(config))?.unobserve(el);
  targets.delete(el);
  clearTimer(el);
}

function syncChildren(host: HTMLElement, own: Set<Element>, config: ResolvedReveal) {
  own.forEach((el) => {
    if (el.parentElement !== host) {
      release(el, config);
      own.delete(el);
    }
  });
  // Ребёнок со своим `reveal` ведёт себя сам — иначе два хозяина спорили бы за его состояние.
  Array.from(host.children).forEach((child) => {
    if (!own.has(child) && !child.hasAttribute('data-reveal')) arm(child, host, config);
  });
}

/**
 * Подключает узел к общему наблюдателю. С `stagger` цели — прямые дети; их состав сторожит
 * `MutationObserver`: дети меняются и без рендера владельца (Suspense внутри, дозагрузка списка),
 * а неподключённый ребёнок простоял бы спрятанным до конца страховки.
 */
export function armReveal(host: HTMLElement, config: ResolvedReveal) {
  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion() || hosts.has(host)) return;
  const own = new Set<Element>();
  hosts.set(host, { own, mutations: null });

  if (config.stagger === 0) {
    arm(host, host, config);
    return;
  }
  syncChildren(host, own, config);
  const mutations = new MutationObserver(() => syncChildren(host, own, config));
  mutations.observe(host, { childList: true });
  hosts.set(host, { own, mutations });
}

/** Отпускает узел и его детей: наблюдатель держит цели сильной ссылкой, без этого — утечка. */
export function releaseReveal(host: HTMLElement) {
  const entry = hosts.get(host);
  if (!entry) return;
  entry.mutations?.disconnect();
  entry.own.forEach((el) => {
    const target = targets.get(el);
    if (target) release(el, target.config);
  });
  hosts.delete(host);
}
