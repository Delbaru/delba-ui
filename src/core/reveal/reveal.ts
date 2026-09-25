/**
 * Появление по скроллу (`reveal` у Flex, Grid, Box, Img) — чистая часть: разбор пропа, CSS-переменные
 * и задержки каскада. Наблюдатель — `./observer.ts`, стили — `./_reveal.scss`.
 *
 * - `fade` — проявление прозрачностью;
 * - `up` — сдвиг снизу + fade;
 * - `left` / `right` — приход слева / справа + fade;
 * - `scale` — лёгкий зум из 0.96 + fade;
 * - `blur` — размытие + fade.
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
}

/** Значение пропа `reveal`: ключ, [ключ] или [ключ, опции] — та же форма, что у `animate` Text и Img. */
export type RevealInput<O extends RevealOptions = RevealOptions> = RevealKey | [RevealKey] | [RevealKey, O];

export interface RevealProps {
  /**
   * Появление при прокрутке: `'fade' | 'up' | 'left' | 'right' | 'scale' | 'blur'` или
   * `[ключ, { stagger, delay, duration, distance, once, threshold, rootMargin }]`. С `stagger` —
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
}

const KEYS: readonly RevealKey[] = ['fade', 'up', 'left', 'right', 'scale', 'blur'];

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
  };
}

/** Тот же проп без каскада — для узла, чьи дети не отдельные элементы списка (слои Img). */
export function withoutStagger(input: RevealInput | undefined): RevealInput | undefined {
  return Array.isArray(input) && input[1]?.stagger ? [input[0], { ...input[1], stagger: 0 }] : input;
}

/** Атрибуты для серверного HTML: по ним CSS прячет элемент (или детей) ещё до гидрации. */
export function revealAttrs(r: ResolvedReveal | null): Record<string, string> | undefined {
  if (!r) return undefined;
  return r.stagger > 0 ? { 'data-reveal': r.key, 'data-reveal-stagger': '' } : { 'data-reveal': r.key };
}

/** Переменные хода на узле: только заданные опции, остальное берёт тема. */
export function revealStyle(r: ResolvedReveal | null): Record<string, string> | undefined {
  if (!r) return undefined;
  const style: Record<string, string> = {};
  if (r.duration != null) style['--reveal-duration'] = `${r.duration}ms`;
  if (r.delay > 0) style['--reveal-delay'] = `${r.delay}ms`;
  if (r.distance != null) style['--reveal-distance'] = String(r.distance);
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
  r ? [r.key, r.stagger, r.delay, r.once, revealObserverKey(r)].join('|') : '';
