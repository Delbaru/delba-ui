'use client';

import { useEffect, type RefObject } from 'react';

import { MEDIA_QUERY } from '../core/base/breakpoints';
import { timeResponse } from '../core/base/damping';
import { subscribeWindowScroll } from '../core/Scroll/Smooth/scroll-events';

export interface ScrollProgressOptions {
  /** Время догоняющего движения в секундах; 0 привязывает полосу напрямую к прокрутке. */
  lag?: number;
}

/** Масштабирует отдельную декоративную поверхность по прогрессу документа. Не обновляет React по кадрам. */
export function useScrollProgress(surface: RefObject<HTMLElement | null>, { lag = 0 }: ScrollProgressOptions = {}) {
    useEffect(() => {
        const el = surface.current;
        if (!el) return;

        const { ownerDocument: document } = el;
        const view = document.defaultView;
        if (!view) return;
        const still = view.matchMedia(MEDIA_QUERY.reducedMotion);
        let shown = 0;
        let target = 0;
        let frame = 0;
        let last = 0;
        let max = 0;
        let y = view.scrollY;

        const paint = () => { el.style.transform = `scaleX(${shown})`; };

        const tick = (now: number) => {
            shown += (target - shown) * timeResponse(lag, now - last);
            last = now;
            if (Math.abs(target - shown) < 0.0005) shown = target;
            paint();
            frame = shown === target ? 0 : view.requestAnimationFrame(tick);
        };

        const measure = () => {
            target = max > 0 ? Math.max(0, Math.min(1, y / max)) : 0;
            if (still.matches || lag <= 0) {
                view.cancelAnimationFrame(frame);
                frame = 0;
                shown = target;
                paint();
            } else if (!frame) {
                last = view.performance.now();
                frame = view.requestAnimationFrame(tick);
            }
        };

        const dimensions = () => {
            max = (document.scrollingElement ?? document.documentElement).scrollHeight - view.innerHeight;
            measure();
        };
        const resize = new view.ResizeObserver(dimensions);
        resize.observe(document.body);
        const unsubscribe = subscribeWindowScroll((value) => { y = value; measure(); }, view);
        view.addEventListener('resize', dimensions);
        still.addEventListener('change', measure);
        dimensions();

        return () => {
            view.cancelAnimationFrame(frame);
            resize.disconnect();
            unsubscribe();
            view.removeEventListener('resize', dimensions);
            still.removeEventListener('change', measure);
        };
    }, [surface, lag]);
}
