import { MOTION_END_BUFFER_MS, prefersReducedMotion, readMotionMs } from '../base/motion';
import { isRevealCascadeChild, isRevealKey, revealDelays, revealObserverKey, type ResolvedReveal } from './reveal';

// Состояние цели — атрибутом, а не классом React: его пишет наблюдатель, рендер о нём не знает.
// нет → до гидрации (прячет страховочная анимация `ui-reveal-hold`), wait → ждёт экрана,
// in → идёт ход, done → доехал: анимация и will-change сняты, узел снова живёт своими стилями.
const STATE = 'data-reveal-state';
const HOLD = 'ui-reveal-hold';

type Target = { host: HTMLElement; config: ResolvedReveal; ownsState: boolean };

const observers = new Map<string, IntersectionObserver>();
const targets = new Map<Element, Target>();
const hosts = new Map<HTMLElement, { own: Set<Element>; mutations: MutationObserver | null }>();
const timers = new Map<Element, ReturnType<typeof setTimeout>>();
const animations = new Map<Element, Animation>();
const pendingClocks = new Set<Element>();
let clockFrame = 0;
let clockTask: ReturnType<typeof setTimeout> | undefined;
const pending = new Set<Element>();
let armScheduled = false;

const setState = (el: Element, state: 'wait' | 'in' | 'done') => el.setAttribute(STATE, state);

function clearCompletion(el: Element) {
  pendingClocks.delete(el);
  if (!pendingClocks.size) {
    cancelAnimationFrame(clockFrame);
    clearTimeout(clockTask);
    clockFrame = 0;
    clockTask = undefined;
  }
  animations.delete(el);
  const timer = timers.get(el);
  if (timer === undefined) return;
  clearTimeout(timer);
  timers.delete(el);
}

function flushClocks() {
  clockTask = undefined;
  const batch = [...pendingClocks].filter(el => targets.has(el) && el.getAttribute(STATE) === 'in');
  pendingClocks.clear();
  const clocks = new Map<Element, Animation>();
  const custom = new Set<Element>();
  const docs = new Set(batch.map(el => el.ownerDocument));
  for (const doc of docs) {
    if (typeof doc.getAnimations !== 'function') continue;
    for (const animation of doc.getAnimations()) {
      if (!(animation instanceof CSSAnimation) || !(animation.effect instanceof KeyframeEffect) || !(animation.effect.target instanceof Element)) continue;
      if (isEntryAnimation(animation)) clocks.set(animation.effect.target, animation);
      else custom.add(animation.effect.target);
    }
  }
  for (const el of batch) {
    const clock = clocks.get(el);
    if (!clock && !custom.has(el) && typeof el.ownerDocument.getAnimations === 'function') {
      // CSS убрал ход или он отменён до регистрации часов: видимого движения уже нет.
      setState(el, 'done');
    } else watchCompletion(el, clock);
  }
}

function scheduleClocks() {
  if (clockFrame || clockTask !== undefined) return;
  // rAF -> task: проверка после layout/paint, а не ещё один forced style внутри IO.
  // CSS стартует от записи in сразу; очередь нужна только для служебного завершения.
  clockFrame = requestAnimationFrame(() => {
    clockFrame = 0;
    clockTask = setTimeout(flushClocks, 0);
  });
}

function watchCompletion(el: Element, animation?: Animation) {
  if (!targets.has(el) || el.getAttribute(STATE) !== 'in') return;
  if (animation && 'finished' in animation) {
    animations.set(el, animation);
    void animation.finished.then(() => {
      if (animations.get(el) !== animation) return;
      animations.delete(el);
      if (el.getAttribute(STATE) === 'in') setState(el, 'done');
    }, () => {
      if (animations.get(el) !== animation) return;
      animations.delete(el);
      // CSS мог отменить или заменить ход. Старое завершение не должно закрыть новый.
      const current = el.getAnimations().filter(item => item.playState !== 'idle');
      const replacement = current.find(isEntryAnimation);
      if (replacement || current.length) watchCompletion(el, replacement);
      else if (el.getAttribute(STATE) === 'in') setState(el, 'done');
    });
    return;
  }
  // Нет native clock или CSS заменил рецепт: сохраняем scoped duration/delay и страховку.
  const ms = el instanceof HTMLElement ? readMotionMs(el, 'animation') : 0;
  timers.set(el, setTimeout(() => {
    timers.delete(el);
    if (el.getAttribute(STATE) === 'in') setState(el, 'done');
  }, ms + MOTION_END_BUFFER_MS));
}

function isEntryAnimation(animation: Animation): boolean {
  return animation instanceof CSSAnimation && animation.animationName === 'ui-reveal' && animation.playState !== 'idle';
}

// Страховка без JS кончилась раньше, чем пришёл JS (медленная гидрация): элемент уже виден, и
// прятать его заново — то самое «видно → пропало → видно». Нет getAnimations — считаем, что идёт.
function holdExpired(el: Element, snapshots: Map<Document, Set<Element>>): boolean {
  const doc = el.ownerDocument;
  if (typeof doc.getAnimations !== 'function') {
    if (typeof el.getAnimations !== 'function') return false;
    return !el.getAnimations().some((a) => a instanceof CSSAnimation && a.animationName === HOLD);
  }
  let held = snapshots.get(doc);
  if (!held) {
    held = new Set<Element>();
    for (const animation of doc.getAnimations()) {
      if (animation instanceof CSSAnimation && animation.animationName === HOLD &&
          animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element) {
        held.add(animation.effect.target);
      }
    }
    snapshots.set(doc, held);
  }
  return !held.has(el);
}

function onScreen(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

function prepare(batch: Element[], config: ResolvedReveal) {
  const delays = revealDelays(batch.length, config);
  batch.forEach((el, index) => {
    if (config.stagger !== 0 && el instanceof HTMLElement) {
      const delay = delays[index] ?? 0;
      el.style.setProperty('--reveal-delay', typeof delay === 'number' ? `${delay}ms` : delay);
    }
    clearCompletion(el);
    setState(el, 'in');
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
      clearCompletion(el);
      setState(el, 'wait');
    }
  }

  batches.forEach(({ config, items }) => {
    items.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    prepare(items, config);
  });
  batches.forEach(({ items }) => items.forEach(el => pendingClocks.add(el)));
  if (pendingClocks.size) scheduleClocks();
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

function flushArmed() {
  armScheduled = false;
  const snapshots = new Map<Document, Set<Element>>();
  // React подключает ref последовательно. Читаем всю пачку до первой записи wait:
  // иначе каждый getAnimations обновляет стили после записи предыдущему участнику.
  const batch = Array.from(pending, (el) => {
    const target = targets.get(el);
    const state = el.getAttribute(STATE);
    const settled = state === 'in' || state === 'done';
    const expired = !state && holdExpired(el, snapshots) && onScreen(el);
    return { el, target, state, settled, expired };
  });
  pending.clear();
  for (const { el, target, state, settled, expired } of batch) {
    if (!target) continue;
    if (!state) setState(el, expired ? 'done' : 'wait');
    if ((!settled && !expired) || !target.config.once) observerFor(target.config).observe(el);
  }
}

function arm(el: Element, host: HTMLElement, config: ResolvedReveal) {
  targets.set(el, { host, config, ownsState: !el.hasAttribute(STATE) });
  hosts.get(host)?.own.add(el);
  pending.add(el);
  if (armScheduled) return;
  armScheduled = true;
  // До отрисовки: SSR hold продолжает скрывать цель, дополнительного кадра нет.
  queueMicrotask(flushArmed);
}

function release(el: Element, config: ResolvedReveal) {
  pending.delete(el);
  observers.get(revealObserverKey(config))?.unobserve(el);
  if (targets.get(el)?.ownsState) {
    el.removeAttribute(STATE);
    if (el instanceof HTMLElement) el.style.removeProperty('--reveal-delay');
  }
  targets.delete(el);
  clearCompletion(el);
}

function syncChildren(host: HTMLElement, own: Set<Element>, config: ResolvedReveal) {
  own.forEach((el) => {
    if (el.parentElement !== host || el.hasAttribute('data-reveal-skip') || isRevealKey(el.getAttribute('data-reveal'))) {
      release(el, config);
      own.delete(el);
    }
  });
  // Ребёнок со своим `reveal` ведёт себя сам — иначе два хозяина спорили бы за его состояние.
  Array.from(host.children).forEach((child) => {
    // Именно СВОЙ: `data-reveal` с чужим значением — пометка проекта, хозяина она не отменяет.
    if (!own.has(child) && isRevealCascadeChild(child)) arm(child, host, config);
  });
}

/**
 * Подключает узел к общему наблюдателю. С `stagger` цели — прямые дети; их состав сторожит
 * `MutationObserver`: дети меняются и без рендера владельца (Suspense внутри, дозагрузка списка),
 * а неподключённый ребёнок простоял бы спрятанным до конца страховки.
 */
export function armReveal(host: HTMLElement, config: ResolvedReveal) {
  // `start: 'load'` играет CSS с первой отрисовки — наблюдать нечего.
  if (config.start === 'load' || typeof IntersectionObserver === 'undefined' || prefersReducedMotion() || hosts.has(host)) return;
  const own = new Set<Element>();
  hosts.set(host, { own, mutations: null });

  if (config.stagger === 0) {
    arm(host, host, config);
    return;
  }
  syncChildren(host, own, config);
  const mutations = new MutationObserver((records) => {
    const directChildrenChanged = records.some((record) =>
      record.type === 'childList'
        ? record.target === host
        : record.target instanceof Element && record.target.parentElement === host,
    );
    if (directChildrenChanged) syncChildren(host, own, config);
  });
  mutations.observe(host, { childList: true, attributes: true, attributeFilter: ['data-reveal', 'data-reveal-skip'], subtree: true });
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
