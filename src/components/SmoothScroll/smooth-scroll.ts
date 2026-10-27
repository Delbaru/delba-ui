import { clamp } from '../../core/utils';
import { scrollEasing } from '../../motion';
import { frameResponse } from '../../core/base/damping';
import { motionScroll } from '../../core/base/motion-config';

/** Функция хода: доля времени 0–1 → доля пути 0–1. */
export type SmoothScrollEasing = (t: number) => number;

/**
 * Сдвиг конечной позиции вниз от верхней кромки окна — под фиксированную шапку.
 * Число — пиксели; строка — CSS-длина или имя переменной (`'--header-h'`, `'calc(var(--header-h) + 24px)'`),
 * её меряет браузер; функция — посчитать самому в момент перелёта.
 */
export type SmoothScrollOffset = number | string | (() => number);

/** easeOutExpo: быстрый старт и долгое мягкое торможение. */
export const easeOutExpo: SmoothScrollEasing = scrollEasing.easeOutExpo;

const LINE_PX = 16;
/** Ближе этого позиция считается пришедшей: дальше лерп ползёт субпиксельно и цикл не гаснет. */
const SETTLE_PX = 0.5;
/**
 * Расхождение позиции окна с последней записанной нами, после которого скролл считается чужим
 * (клавиатура, полоса прокрутки, поиск, фокус). Меньше 1.5 нельзя: браузер округляет дробную
 * позицию до пикселя устройства, и ход обрывался бы сам собой.
 */
const DRIFT_PX = 1.5;

/** Дельта колеса в пикселях: строки и страницы (`deltaMode` 1 и 2) приводятся к px. */
export function wheelDeltaPx(deltaY: number, deltaMode: number, viewportHeight: number): number {
  if (deltaMode === 1) return deltaY * LINE_PX;
  if (deltaMode === 2) return deltaY * viewportHeight;
  return deltaY;
}

export function clampScroll(y: number, max: number): number {
  return clamp(y, 0, Math.max(0, max));
}

/**
 * Шаг инерции: `lerp` — доля оставшегося пути за кадр 60 Гц. Доля пересчитывается от реального
 * времени кадра, иначе на 120 Гц колесо ехало бы вдвое быстрее.
 */
export function lerpStep(current: number, target: number, lerp: number, dtMs: number): number {
  const share = frameResponse(lerp, dtMs, 0.01);
  const next = current + (target - current) * share;

  return Math.abs(target - next) < SETTLE_PX ? target : next;
}

/** Позиция перелёта по времени. `done` — пришли, цикл можно гасить. */
export function tweenPosition(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs: number,
  easing: SmoothScrollEasing
): { y: number; done: boolean } {
  if (durationMs <= 0 || elapsedMs >= durationMs) return { y: to, done: true };

  return { y: from + (to - from) * easing(Math.max(0, elapsedMs) / durationMs), done: false };
}

/** Длительность от расстояния в экранах: короткий перелёт не тянется секунду, длинный не свистит. */
export function autoDurationMs(distance: number, viewportHeight: number): number {
  const screens = Math.abs(distance) / Math.max(1, viewportHeight);

  const minimum = motionScroll.minDuration * 1000;
  const maximum = motionScroll.maxDuration * 1000;
  return clamp(minimum + motionScroll.durationPerScreen * 1000 * Math.sqrt(screens), minimum, maximum);
}

/** Строковый offset → значение CSS: голое имя переменной заворачивается в `var()`. */
export function offsetCss(offset: string): string {
  const value = offset.trim();

  return value.startsWith('--') ? `var(${value})` : value;
}

/**
 * Позиция окна, при которой элемент встаёт под шапку. `scroll-margin-top` цели, если задан,
 * ЗАМЕНЯЕТ общий offset, а не складывается с ним: так делает и браузер, и проекты уже пишут
 * в нём полный отступ (`calc(var(--header-h) + …)`).
 */
export function anchorTop(elementTop: number, scrollY: number, offset: number, scrollMargin: number): number {
  return elementTop + scrollY - (scrollMargin > 0 ? scrollMargin : offset);
}

/** Может ли вложенный контейнер сам прокрутиться в сторону дельты. */
export function canScrollBy(box: { scrollTop: number; scrollHeight: number; clientHeight: number }, delta: number): boolean {
  if (delta < 0) return box.scrollTop > SETTLE_PX;
  if (delta > 0) return box.scrollTop + box.clientHeight < box.scrollHeight - SETTLE_PX;
  return false;
}

export function isManualDrift(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) > DRIFT_PX;
}

function trimSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/**
 * Якорь ссылки на ЭТУ ЖЕ страницу: `#id`, `/#id` на главной, полный адрес с тем же путём и
 * запросом. Другая страница, пустой `#` и ссылка без хеша — `null`, их ведёт браузер или роутер.
 */
export function hashTarget(href: string, currentHref: string): string | null {
  let url: URL;
  let here: URL;

  try {
    url = new URL(href, currentHref);
    here = new URL(currentHref);
  } catch {
    return null;
  }

  if (url.origin !== here.origin || trimSlash(url.pathname) !== trimSlash(here.pathname) || url.search !== here.search) return null;
  if (url.hash.length <= 1) return null;

  const raw = url.hash.slice(1);

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
