'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { createSmoothScroll, type SmoothScrollConfig, type SmoothScrollController, type SmoothScrollTarget, type SmoothScrollToOptions } from './engine';
import { easeOutExpo, type SmoothScrollEasing, type SmoothScrollOffset } from './smooth-scroll';

export type SmoothScrollProps = {
  children: ReactNode;
  /** Инерция колеса: доля оставшегося пути за кадр 60 Гц, 0–1. Меньше — плавнее и дольше. По умолчанию `0.1`. */
  lerp?: number;
  /** Множитель шага колеса и тачпада. По умолчанию `1`. */
  wheelMultiplier?: number;
  /** Длительность перелёта `scrollTo` и якорей, секунды. По умолчанию — от расстояния, 0.4–1.2 с. */
  duration?: number;
  /** Функция хода перелёта (доля времени → доля пути). По умолчанию easeOutExpo. */
  easing?: SmoothScrollEasing;
  /**
   * Отступ под фиксированную шапку для якорей и `scrollTo(элемент)`: px, CSS-длина или имя
   * переменной (`'--header-h'` — меряется на текущей ширине), функция. `scroll-margin-top` цели
   * его заменяет. По умолчанию `0`.
   */
  offset?: SmoothScrollOffset;
  /**
   * Плавность ниже десктопа и на сенсорных экранах. По умолчанию `false`: там колесо не
   * перехватывается, а перелёты ведёт браузер (`behavior: 'smooth'`).
   */
  mobile?: boolean;
  /** Перехватывать клики по ссылкам `#id` и `/путь#id` этой же страницы. По умолчанию `true`. */
  anchors?: boolean;
  /** Писать хеш якоря в адрес (`history.pushState`, без прыжка). По умолчанию `true`. */
  updateHash?: boolean;
};

/** API плавной прокрутки. Значение стабильно: чтение `scrollY` ре-рендер не вызывает. */
export type SmoothScrollApi = {
  /** Плавно к позиции (px), элементу, `'#id'` или селектору; к элементу — с учётом offset. */
  scrollTo: (target: SmoothScrollTarget, options?: SmoothScrollToOptions) => void;
  /** Оборвать текущий ход на месте. */
  stop: () => void;
  /** Текущая позиция окна — живой геттер, не реактивен. */
  readonly scrollY: number;
  /** Подписка на прокрутку окна (любую — колесом, клавишами, перелётом). Возвращает отписку. */
  subscribe: (listener: (scrollY: number) => void) => () => void;
};

const SmoothScrollContext = createContext<SmoothScrollApi | null>(null);

/** API прокрутки; вне `SmoothScroll` — ошибка. */
export function useSmoothScroll(): SmoothScrollApi {
  const api = useContext(SmoothScrollContext);
  if (!api) throw new Error('useSmoothScroll must be used within SmoothScroll');
  return api;
}

/** То же, но вне провайдера отдаёт `null` — для компонентов, которые живут и без него. */
export function useSmoothScrollOptional(): SmoothScrollApi | null {
  return useContext(SmoothScrollContext);
}

/**
 * Плавная прокрутка окна без зависимостей: инерция колеса на десктопе, якоря с отступом под
 * шапку, API `scrollTo` через `useSmoothScroll`. Скролл остаётся нативным — sticky, поиск,
 * фокус и клавиатура работают как без него. Замена `LenisScroll`.
 */
export function SmoothScroll({
  children,
  lerp = 0.1,
  wheelMultiplier = 1,
  duration,
  easing = easeOutExpo,
  offset = 0,
  mobile = false,
  anchors = true,
  updateHash = true,
}: SmoothScrollProps) {
  const engineRef = useRef<SmoothScrollController | null>(null);
  const config: SmoothScrollConfig = { lerp, wheelMultiplier, duration, easing, offset, mobile, anchors, updateHash };
  const configRef = useRef(config);

  // Конфиг едет в живой движок, а не пересоздаёт его: пересоздание рвало бы ход. Эффект стоит
  // ПЕРВЫМ — на монтировании движок ниже берёт уже свежий конфиг.
  useEffect(() => {
    configRef.current = config;
    engineRef.current?.configure(config);
  });

  useEffect(() => {
    const engine = createSmoothScroll(configRef.current);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const api = useMemo<SmoothScrollApi>(() => ({
    scrollTo: (target, options) => {
      const engine = engineRef.current;
      if (engine) engine.scrollTo(target, options);
      // До монтирования движка — нативный ход, чтобы ранний вызов не пропал.
      else if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
    },
    stop: () => engineRef.current?.stop(),
    get scrollY() {
      return typeof window === 'undefined' ? 0 : window.scrollY;
    },
    // Скролл нативный, поэтому подписка — прямо на окно: эффект потомка идёт раньше эффекта
    // провайдера, и подписка через движок в первом кадре потерялась бы.
    subscribe: (listener) => {
      const handle = () => listener(window.scrollY);
      window.addEventListener('scroll', handle, { passive: true });
      return () => window.removeEventListener('scroll', handle);
    },
  }), []);

  return <SmoothScrollContext.Provider value={api}>{children}</SmoothScrollContext.Provider>;
}
