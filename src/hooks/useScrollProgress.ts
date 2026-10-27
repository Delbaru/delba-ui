'use client';

import { useEffect, type RefObject } from 'react';

import { MEDIA_QUERY } from '../core/base/breakpoints';
import { useSmoothScroll } from '../components/SmoothScroll';
import { timeResponse } from '../core/base/damping';

export interface ScrollProgressOptions {
  /** Время догоняющего движения в секундах; 0 привязывает полосу напрямую к прокрутке. */
  lag?: number;
}

/** Масштабирует отдельную декоративную поверхность по прогрессу документа. Не обновляет React по кадрам. */
export function useScrollProgress(surface: RefObject<HTMLElement | null>, { lag = 0 }: ScrollProgressOptions = {}) {
    const scrollApi = useSmoothScroll();
    useEffect(() => {
        const el = surface.current;
        if (!el) return;

        const still = matchMedia(MEDIA_QUERY.reducedMotion);
        let shown = 0;
        let target = 0;
        let frame = 0;
        let last = 0;
        let max = 0;
        let y = scrollApi.scrollY;

        const paint = () => { el.style.transform = `scaleX(${shown})`; };

        const tick = (now: number) => {
            shown += (target - shown) * timeResponse(lag, now - last);
            last = now;
            if (Math.abs(target - shown) < 0.0005) shown = target;
            paint();
            frame = shown === target ? 0 : requestAnimationFrame(tick);
        };

        const measure = () => {
            target = max > 0 ? Math.max(0, Math.min(1, y / max)) : 0;
            if (still.matches || lag <= 0) {
                cancelAnimationFrame(frame);
                frame = 0;
                shown = target;
                paint();
            } else if (!frame) {
                last = performance.now();
                frame = requestAnimationFrame(tick);
            }
        };

        const dimensions = () => {
            max = document.documentElement.scrollHeight - innerHeight;
            measure();
        };
        const resize = new ResizeObserver(dimensions);
        resize.observe(document.body);
        const unsubscribe = scrollApi.subscribe((value) => { y = value; measure(); });
        addEventListener('resize', dimensions);
        still.addEventListener('change', measure);
        dimensions();

        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            unsubscribe();
            removeEventListener('resize', dimensions);
            still.removeEventListener('change', measure);
        };
    }, [scrollApi, surface, lag]);
}
