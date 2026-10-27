'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { MEDIA_QUERY } from '../../../core/base/breakpoints';
import { readMotionTimeMs } from '../../../core/base/timing';
import { normalizeObserverMargin } from '../../../core/base/observer-margin';
import { configuredMotionEasing, motionInView } from '../../../core/base/motion-config';
import { isRevealKey, resolveReveal, revealAttrs, revealStyle } from '../../../core/reveal/reveal';
import { parseCountContent } from './counter/parseContent';
import { effectProgress, resolveTextTimeline, type TextTimelineAnimate } from './timeline';

/** Родительский reveal может уже пересекать экран, но ещё ждать свой stagger/delay. */
function ancestorsReady(node: HTMLElement): boolean {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (parent.getAttribute('data-reveal-state') === 'wait') return false;
    for (const animation of parent.getAnimations()) {
      if (!(animation instanceof CSSAnimation) || !animation.animationName.startsWith('ui-reveal')) continue;
      if (animation.animationName === 'ui-reveal-hold' || animation.animationName === 'ui-reveal-wait') return false;
      if (animation.effect?.getComputedTiming().progress == null) return false;
      // backwards fill has progress 0 during delay: use local time, not eased progress.
      const delay = Number(animation.effect?.getTiming().delay ?? 0);
      if (Number(animation.currentTime ?? 0) < delay) return false;
    }
  }
  return true;
}

export function useTextTimeline(input: TextTimelineAnimate | undefined, content: ReactNode, host: RefObject<HTMLElement | null>) {
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const options = input?.effect.counter;
  const parsed = options && options.to == null ? parseCountContent(typeof content === 'number' ? String(content) : content) : null;
  const to = options?.to ?? parsed?.to ?? 0;
  const start = options?.start ?? 0;
  const prefix = parsed?.prefix ?? '';
  const suffix = options?.suffix ?? parsed?.suffix ?? '';
  const grouped = options?.grouped ?? parsed?.grouped ?? false;
  const format = (value: number) => `${prefix}${grouped ? value.toLocaleString('ru-RU') : value}${suffix}`;
  const hasCounter = !!options && (options.to != null || parsed != null);
  const appearanceKey = input && Object.keys(input.effect).filter(isRevealKey).find(key => input.effect[key] != null);
  const appearance = appearanceKey ? input?.effect[appearanceKey] : undefined;
  const reveal = appearanceKey ? resolveReveal({ effect: appearanceKey, ...appearance }) : null;
  const attrs = revealAttrs(reveal);
  const style = revealStyle(reveal) as CSSProperties | undefined;
  if (style) {
    Object.assign(style, { '--reveal-delay': 'var(--text-timeline-delay, 0ms)', '--reveal-duration': 'var(--text-timeline-duration, var(--t-m-reveal-duration))' });
  }
  // Семантически одинаковый литерал при ререндере не перезапускает ход.
  const signature = input ? JSON.stringify([input, to, start, prefix, suffix, grouped, hasCounter]) : '';
  const latest = useRef({ input, format, hasCounter, appearanceKey, to, start });
  useLayoutEffect(() => { latest.current = { input, format, hasCounter, appearanceKey, to, start }; });

  useLayoutEffect(() => {
    const node = host.current;
    const current = latest.current;
    const config = current.input;
    if (!node || !config) return undefined;
    const timeline = resolveTextTimeline(config, (time) => readMotionTimeMs(time, node));
    const counterEasing = configuredMotionEasing('counter');
    const appearanceWindow = current.appearanceKey ? timeline.effects[current.appearanceKey] : undefined;
    if (appearanceWindow) {
      node.style.setProperty('--text-timeline-delay', `${appearanceWindow.start}ms`);
      node.style.setProperty('--text-timeline-duration', `${appearanceWindow.duration}ms`);
    }
    const mq = window.matchMedia(MEDIA_QUERY.reducedMotion);
    let frame = 0;
    let active = false;
    let finished = false;
    let visible = config.when === 'load';
    let origin: number | null = null;
    let animation: Animation | undefined;
    const write = (value: number) => {
      const target = valueRef.current;
      const text = current.format(value);
      if (target && target.textContent !== text) target.textContent = text;
    };
    const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
    const finish = () => {
      cancel();
      finished = true;
      active = false;
      write(current.to);
      if (appearanceWindow) node.setAttribute('data-reveal-state', 'done');
    };
    const reset = () => {
      cancel();
      active = false;
      finished = false;
      origin = null;
      animation = undefined;
      write(current.start);
      if (appearanceWindow) node.setAttribute('data-reveal-state', 'wait');
    };
    const tick = (now: number) => {
      if (!active) {
        if (!ancestorsReady(node)) { frame = requestAnimationFrame(tick); return; }
        active = true;
        origin = now;
        if (appearanceWindow) {
          node.setAttribute('data-reveal-state', 'in');
          animation = node.getAnimations().find((item) => item instanceof CSSAnimation && item.animationName === 'ui-reveal');
        }
      }
      // Часы CSS-анимации учитывают delay и паузы. После её конца продолжаем от startTime:
      // currentTime уже замрёт, а зависимый counter может ещё идти.
      const elapsed = animation
        ? animation.playState === 'paused' || animation.startTime == null
          ? Number(animation.currentTime ?? 0)
          : (Number(animation.timeline?.currentTime ?? now) - Number(animation.startTime)) * animation.playbackRate
        : now - (origin ?? now);
      const counter = timeline.effects.counter;
      if (counter && current.hasCounter) {
        const progress = effectProgress(counter, elapsed);
        write(Math.round(current.start + (current.to - current.start) * counterEasing(progress)));
      }
      if (elapsed >= timeline.end) { finish(); return; }
      frame = requestAnimationFrame(tick);
    };
    const play = () => {
      if (mq.matches) { finish(); return; }
      if (finished || frame || active || !visible) return;
      frame = requestAnimationFrame(tick);
    };
    const preference = () => { if (mq.matches) finish(); else play(); };
    mq.addEventListener('change', preference);
    reset();
    if (mq.matches) finish();
    let observer: IntersectionObserver | undefined;
    if (config.when === 'inView' && typeof IntersectionObserver !== 'undefined') {
      const threshold = Math.min(1, Math.max(0, config.threshold ?? motionInView.threshold));
      observer = new IntersectionObserver(([entry]) => {
        if (!entry) return;
        visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
        if (visible) play();
        else if (config.once === false && !mq.matches) reset();
        else if (!active) cancel();
      }, { threshold, rootMargin: normalizeObserverMargin(config.rootMargin ?? motionInView.rootMargin) ?? '0px' });
      observer.observe(node);
    } else {
      visible = true;
      play();
    }
    return () => {
      cancel();
      observer?.disconnect();
      mq.removeEventListener('change', preference);
      if (appearanceWindow) node.removeAttribute('data-reveal-state');
      node.style.removeProperty('--text-timeline-delay');
      node.style.removeProperty('--text-timeline-duration');
    };
  }, [host, signature]);

  return { attrs, style, valueRef, hasCounter, finalText: format(to) };
}
