/**
 * Появление по скроллу (`reveal` у Flex, Grid, Box, Img) — чистая часть: разбор пропа, CSS-переменные
 * и задержки каскада. Наблюдатель — `./observer.ts`, стили — `./_reveal.scss`.
 *
 * - `fade` — проявление прозрачностью;
 * - `up` — сдвиг снизу + fade;
 * - `left` / `right` — приход слева / справа + fade;
 * - `scale` — лёгкий зум из 0.96 + fade;
 * - `expandX` — горизонтальное раскрытие слева направо;
 * - `blur` — размытие + fade.
 *
 * `fade: false` снимает прозрачность, `start: 'load'` запускает ход чистым CSS с первой отрисовки.
 */
import { isMotionTimingName, motionTimingVariable, type MotionTime, type MotionTimingName } from '../base/timing';
import { motionDistanceCss, normalizeMotionDistance, type MotionDistance } from '../base/distance';
import { normalizeObserverMargin, type ObserverMargin } from '../base/observer-margin';
import { motionInView } from '../base/motion-config';

export type RevealKey = 'fade' | 'up' | 'down' | 'left' | 'right' | 'scale' | 'expandX' | 'blur';

export interface RevealOptions {
  /** Интервал стартов прямых детей: имя motion.timing либо секунды. Нет или `0` — появляется корень целиком. */
  stagger?: MotionTime;
  /** Задержка перед ходом: имя motion.timing либо секунды. По умолчанию `0`. */
  delay?: MotionTime;
  /** Длительность: имя motion.timing либо секунды. По умолчанию motion.defaults.reveal.duration. */
  duration?: MotionTime;
  /** Сдвиг: число в rpx, процент собственного размера или имя motion.distance. По умолчанию 32rpx. */
  distance?: MotionDistance;
  /** Один раз (по умолчанию) или при каждом входе в экран: `false` снова прячет ушедший вниз элемент. */
  once?: boolean;
  /** Доля площади в экране, с которой стартует ход. По умолчанию motion.inView.threshold (база 0). */
  threshold?: number;
  /** Четыре поля области IntersectionObserver; legacy string допустим. По умолчанию motion.inView.rootMargin. */
  rootMargin?: ObserverMargin;
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

/** Объектная форма reveal. Секунды, пороги и остальные опции совпадают с legacy API. */
export type RevealConfig<O extends RevealOptions = RevealOptions> = { effect: RevealKey } & O;

/** Shared appearance animation: scroll or first paint. */
export type AppearanceAnimate = { when: 'inView' | 'load' } & Omit<RevealConfig, 'start'>;

/** An owner's open state drives both enter and exit; opt in only on components with that state. */
export type OpenAnimate = { when: 'open' } & Omit<RevealConfig, 'start' | 'stagger' | 'once' | 'threshold' | 'rootMargin'>;

/** Narrow type for the observer-started appearance variant. */
export type InViewAnimate = { when: 'inView' } & Omit<RevealConfig, 'start'>;

/**
 * Значение пропа `reveal`. Предпочтительная запись — объект `{ effect, ...options }`;
 * ключи и tuple `[key, options]` остаются для совместимости.
 */
export type RevealInput<O extends RevealOptions = RevealOptions> =
  | RevealConfig<O>
  | RevealKey
  | [RevealKey]
  | [RevealKey, O];

/** True only for the shared appearance shape; legacy content/swap animate values stay separate. */
export function isAppearanceAnimate(value: unknown): value is AppearanceAnimate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as { when?: unknown; effect?: unknown };
  return (candidate.when === 'inView' || candidate.when === 'load') && isRevealKey(candidate.effect as string | null | undefined);
}

export function isOpenAnimate(value: unknown): value is OpenAnimate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as { when?: unknown; effect?: unknown };
  return candidate.when === 'open' && isRevealKey(candidate.effect as string | null | undefined);
}

/** Narrow guard for consumers that specifically require an observer-started reveal. */
export function isInViewAnimate(value: unknown): value is InViewAnimate {
  return isAppearanceAnimate(value) && value.when === 'inView';
}

/** An explicit `animate={{ when: 'inView' }}` takes precedence over the legacy `reveal` prop. */
export function resolveRevealInput(animate: unknown, reveal: RevealInput | undefined): RevealInput | undefined {
  return isAppearanceAnimate(animate)
    ? { ...animate, start: animate.when === 'load' ? 'load' : 'view' }
    : reveal;
}

export interface RevealProps {
  /**
   * Появление при прокрутке: `{ effect: 'up', delay: 0.16 }`. Опции: `stagger`, `delay`, `duration`,
   * `distance`, `once`, `threshold`, `rootMargin`, `fade`, `start`. Tuple `[key, options]` и ключи
   * сохранены для совместимости. С `stagger` — каскадом по прямым детям. Без JS и при «меньше движения»
   * контент виден сразу. См. `RevealOptions`.
   */
  reveal?: RevealInput;

  /**
   * Исключает узел из каскада reveal его родителя, не отменяя его собственную анимацию.
   * Установите `true` или уберите атрибут через `undefined`; учитывается load CSS и observer.
   */
  'data-reveal-skip'?: true;
}

export interface ResolvedReveal {
  key: RevealKey;
  /** Шаг каскада: мс либо имя времени темы; `0` — анимируется сам элемент. */
  stagger: number | MotionTimingName;
  delay: number | MotionTimingName;
  duration: number | MotionTimingName | null;
  distance: MotionDistance | null;
  once: boolean;
  threshold: number;
  rootMargin: string;
  fade: boolean;
  start: 'view' | 'load';
}

const KEYS: readonly RevealKey[] = ['fade', 'up', 'down', 'left', 'right', 'scale', 'expandX', 'blur'];

/** Пометка кита, а не проекта: `data-reveal` — имя заманчивое, на нём держат и свои каскады. */
export const isRevealKey = (value: string | null | undefined): value is RevealKey =>
  value != null && KEYS.includes(value as RevealKey);

/** Прямой ребёнок участвует в каскаде, если не помечен как пропускаемый и не владеет reveal сам. */
export function isRevealCascadeChild(child: Pick<Element, 'getAttribute'>): boolean {
  return child.getAttribute('data-reveal-skip') === null
    && child.getAttribute('data-reveal-state') === null
    && !isRevealKey(child.getAttribute('data-reveal'));
}

const toMs = (seconds: MotionTime | undefined): number | MotionTimingName =>
  isMotionTimingName(seconds) ? seconds
    : typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : 0;

/** Нормализованное время → CSS; имена остаются переменными и на сервере, и в observer. */
const timeCss = (value: number | MotionTimingName): string =>
  typeof value === 'number' ? `${value}ms` : `var(${motionTimingVariable(value)})`;

/** Проп → нормализованные опции; нет пропа или чужой ключ — `null`. */
export function resolveReveal(input: RevealInput | undefined | null): ResolvedReveal | null {
  if (input == null) return null;

  const key = Array.isArray(input) ? input[0] : typeof input === 'string' ? input : input.effect;
  const options: RevealOptions = Array.isArray(input)
    ? input[1] ?? {}
    : typeof input === 'string'
      ? {}
      : input;
  if (!isRevealKey(key)) return null;
  const duration = toMs(options.duration);

  return {
    key,
    stagger: toMs(options.stagger),
    delay: toMs(options.delay),
    duration: options.duration === undefined ? null : duration,
    distance: normalizeMotionDistance(options.distance),
    once: options.once ?? true,
    threshold: Math.min(1, Math.max(0, options.threshold ?? motionInView.threshold)),
    rootMargin: normalizeObserverMargin(options.rootMargin ?? motionInView.rootMargin) ?? '0px',
    fade: options.fade ?? true,
    start: options.start === 'load' ? 'load' : 'view',
  };
}

/** Тот же проп без каскада — для узла, чьи дети не отдельные элементы списка (слои Img). */
export function withoutStagger(input: RevealInput | undefined): RevealInput | undefined {
  if (Array.isArray(input)) {
    return input[1]?.stagger ? [input[0], { ...input[1], stagger: 0 }] : input;
  }

  if (input && typeof input === 'object') {
    return input.stagger ? { ...input, stagger: 0 } : input;
  }

  return input;
}

/** Атрибуты для серверного HTML: по ним CSS прячет элемент (или детей) ещё до гидрации. */
export function revealAttrs(r: ResolvedReveal | null): Record<string, string> | undefined {
  if (!r) return undefined;
  const attrs: Record<string, string> = { 'data-reveal': r.key };
  if (r.stagger !== 0) attrs['data-reveal-stagger'] = '';
  if (r.start === 'load') attrs['data-reveal-start'] = 'load';
  return attrs;
}

/** Переменные хода на узле: только заданные опции, остальное берёт тема. */
export function revealStyle(r: ResolvedReveal | null): Record<string, string> | undefined {
  if (!r) return undefined;
  const style: Record<string, string> = {};
  if (r.duration != null) style['--reveal-duration'] = timeCss(r.duration);
  if (r.delay !== 0) style['--reveal-delay'] = timeCss(r.delay);
  if (r.distance != null) style['--reveal-distance'] = motionDistanceCss(r.distance);
  if (!r.fade) style['--reveal-o'] = '1';
  // Каскад без JS: шаг — переменной, порядок ребёнка CSS берёт из :nth-child.
  if (r.start === 'load' && r.stagger !== 0) style['--reveal-step'] = timeCss(r.stagger);
  return style;
}

/** Задержки пачки: мс либо CSS calc для имён темы. Пачка — дети, вошедшие в экран одним отчётом. */
export function revealDelays(count: number, r: Pick<ResolvedReveal, 'delay' | 'stagger'>): (number | string)[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    typeof r.delay === 'number' && typeof r.stagger === 'number'
      ? r.delay + index * r.stagger
      : `calc(${timeCss(r.delay)} + ${index} * ${timeCss(r.stagger)})`);
}

/** Ключ общего наблюдателя: элементы с одинаковыми полями и порогом делят один `IntersectionObserver`. */
export const revealObserverKey = (r: Pick<ResolvedReveal, 'threshold' | 'rootMargin'>): string => `${r.threshold}|${r.rootMargin}`;

/** Подпись опций для зависимостей эффекта: новый массив-литерал каждый рендер не должен перевешивать наблюдение. */
export const revealSignature = (r: ResolvedReveal | null): string =>
  r ? [r.key, r.stagger, r.delay, r.once, r.start, revealObserverKey(r)].join('|') : '';
