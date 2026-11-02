'use client';

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import { registerScrollProvider, unregisterScrollProvider } from '../../core/base/scroll';
import { createSmoothScroll, type SmoothScrollConfig, type SmoothScrollController } from './engine';
import { motionScroll } from '../../core/base/motion-config';
import { subscribeWindowScroll } from './scroll-events';

export type { SmoothScrollProps, SmoothScrollApi } from './SmoothScroll.types';
import type { SmoothScrollProps, SmoothScrollApi } from './SmoothScroll.types';

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
 * фокус и клавиатура работают как без него.
 */
export function SmoothScroll({
  children,
  lerp = motionScroll.lerp,
  wheelMultiplier = 1,
  duration = motionScroll.duration,
  easing = motionScroll.easing,
  offset = motionScroll.offset,
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
      else if (typeof window !== 'undefined' && typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
    },
    stop: () => engineRef.current?.stop(),
    get scrollY() {
      return typeof window === 'undefined' ? 0 : window.scrollY;
    },
    // Скролл нативный, поэтому подписка — прямо на окно: эффект потомка идёт раньше эффекта
    // провайдера, и подписка через движок в первом кадре потерялась бы.
    subscribe: subscribeWindowScroll,
  }), []);

  // Дверь scrollTo ядра едет через этого провайдера, пока он жив, и падает в нативную прокрутку без него.
  useEffect(() => {
    registerScrollProvider(api);

    return () => unregisterScrollProvider(api);
  }, [api]);

  return <SmoothScrollContext.Provider value={api}>{children}</SmoothScrollContext.Provider>;
}
