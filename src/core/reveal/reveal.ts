/**
 * Появление по скроллу (`reveal` у Flex, Grid, Box, Img) — чистая часть: разбор пропа, CSS-переменные
 * и задержки каскада. Наблюдатель — `./observer.ts`, стили — `./_reveal.scss`.
 *
 * - `fade` — проявление прозрачностью;
 * - `up` — сдвиг снизу + fade;
 * - `left` / `right` — приход слева / справа + fade;
 * - `scale` — лёгкий зум из 0.96 + fade;
 * - `blur` — размытие + fade.
 *
 * `fade: false` снимает прозрачность, `start: 'load'` запускает ход чистым CSS с первой отрисовки.
 */
export type RevealKey = 'fade' | 'up' | 'left' | 'right' | 'scale' | 'blur';

export interface RevealOptions {
  /** Каскад по прямым детям, сек: сосед стартует на столько позже. Нет или `0` — появляется сам элемент целиком. */
  stagger?: number;
  /** Задержка перед ходом, сек. По умолчанию `0`. */
  delay?: number;
  /** Длительность хода, сек. По умолчанию — токен `--t-d-slow`, кривая — `--t-t-f-cubic-bezier`. */
  duration?: number;
  /** Сдвиг для `up`/`left`/`right`, rpx (кратно 4). По умолчанию `32`. */
  distance?: number;
  /** Один раз (по умолчанию) или при каждом входе в экран: `false` снова прячет ушедший вниз элемент. */
  once?: boolean;
  /** Доля площади в экране, с которой стартует ход. По умолчанию `0` — с первого пикселя. */
  threshold?: number;
  /** Поля области наблюдения, как у `IntersectionObserver`. По умолчанию `'0px'`. */
  rootMargin?: string;
  /**
   * Проявление прозрачностью. `false` — элемент виден с первого кадра и только доезжает сдвигом, зумом
   * или размытием: для первого экрана, где прозрачный узел не засчитывается в LCP. По умолчанию `true`.
   */
  fade?: boolean;
  /**
   * Когда стартует ход: `'view'` (по умолчанию) — при входе в экран, после гидрации; `'load'` — сразу при
   * первой отрисовке, чистым CSS, без JS. Для первого экрана. `once`, `threshold`, `rootMargin` при `'load'` не действуют.
   */
  start?: 'view' | 'load';
}

/** Значение пропа `reveal`: ключ, [ключ] или [ключ, опции] — та же форма, что у `animate` Text и Img. */
export type RevealInput<O extends RevealOptions = RevealOptions> = RevealKey | [RevealKey] | [RevealKey, O];

export interface RevealProps {
  /**
   * Появление при прокрутке: `'fade' | 'up' | 'left' | 'right' | 'scale' | 'blur'` или
   * `[ключ, { stagger, delay, duration, distance, once, threshold, rootMargin, fade, start }]`. С `stagger` —
   * каскадом по прямым детям. Без JS и при «меньше движения» контент виден сразу. См. `RevealOptions`.
   */
  reveal?: RevealInput;
}

export interface ResolvedReveal {
  key: RevealKey;
  /** Шаг каскада, мс; `0` — анимируется сам элемент. */
  stagger: number;
  delay: number;
  duration: number | null;
  distance: number | null;
  once: boolean;
  threshold: number;
  rootMargin: string;
  fade: boolean;
  start: 'view' | 'load';
}

const KEYS: readonly RevealKey[] = ['fade', 'up', 'left', 'right', 'scale', 'blur'];

/** Пометка кита, а не проекта: `data-reveal` — имя заманчивое, на нём держат и свои каскады. */
export const isRevealKey = (value: string | null | undefined): value is RevealKey =>
  value != null && KEYS.includes(value as RevealKey);

const toMs = (seconds: number | undefined): number =>
  seconds != null && Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : 0;

/** Проп → нормализованные опции; нет пропа или чужой ключ — `null`. */
export function resolveReveal(input: RevealInput | undefined | null): ResolvedReveal | null {
  if (input == null) return null;
  const [key, options = {}] = Array.isArray(input) ? input : [input];
  if (!KEYS.includes(key)) return null;
  const duration = toMs(options.duration);

  return {
    key,
    stagger: toMs(options.stagger),
    delay: toMs(options.delay),
    duration: duration > 0 ? duration : null,
    distance: options.distance != null && Number.isFinite(options.distance) ? Math.abs(options.distance) : null,
    once: options.once ?? true,
    threshold: Math.min(1, Math.max(0, options.threshold ?? 0)),
    rootMargin: options.rootMargin ?? '0px',
    fade: options.fade ?? true,
    start: options.start === 'load' ? 'load' : 'view',
  };
}

/** Тот же проп без каскада — для узла, чьи дети не отдельные элементы списка (слои Img). */
export function withoutStagger(input: RevealInput | undefined): RevealInput | undefined {
  return Array.isArray(input) && input[1]?.stagger ? [input[0], { ...input[1], stagger: 0 }] : input;
}

/** Атрибуты для серверного HTML: по ним CSS прячет элемент (или детей) ещё до гидрации. */
export function revealAttrs(r: ResolvedReveal | null): Record<string, string> | undefined {
  if (!r) return undefined;
  const attrs: Record<string, string> = { 'data-reveal': r.key };
  if (r.stagger > 0) attrs['data-reveal-stagger'] = '';
  if (r.start === 'load') attrs['data-reveal-start'] = 'load';
  return attrs;
}

/** Переменные хода на узле: только заданные опции, остальное берёт тема. */
export function revealStyle(r: ResolvedReveal | null): Record<string, string> | undefined {
  if (!r) return undefined;
  const style: Record<string, string> = {};
  if (r.duration != null) style['--reveal-duration'] = `${r.duration}ms`;
  if (r.delay > 0) style['--reveal-delay'] = `${r.delay}ms`;
  if (r.distance != null) style['--reveal-distance'] = String(r.distance);
  if (!r.fade) style['--reveal-o'] = '1';
  // Каскад без JS: шаг — переменной, порядок ребёнка CSS берёт из :nth-child.
  if (r.start === 'load' && r.stagger > 0) style['--reveal-step'] = `${r.stagger}ms`;
  return style;
}

/** Задержки пачки, мс: `delay + порядок в пачке × stagger`. Пачка — дети, вошедшие в экран одним отчётом. */
export function revealDelays(count: number, r: Pick<ResolvedReveal, 'delay' | 'stagger'>): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => r.delay + index * r.stagger);
}

/** Ключ общего наблюдателя: элементы с одинаковыми полями и порогом делят один `IntersectionObserver`. */
export const revealObserverKey = (r: Pick<ResolvedReveal, 'threshold' | 'rootMargin'>): string => `${r.threshold}|${r.rootMargin}`;

/** Подпись опций для зависимостей эффекта: новый массив-литерал каждый рендер не должен перевешивать наблюдение. */
export const revealSignature = (r: ResolvedReveal | null): string =>
  r ? [r.key, r.stagger, r.delay, r.once, r.start, revealObserverKey(r)].join('|') : '';
