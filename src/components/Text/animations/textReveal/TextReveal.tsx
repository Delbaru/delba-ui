'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';

import { cx, MOTION_END_BUFFER_MS, prefersReducedMotion } from '../../../../core';
import { flattenAnimatableText } from '../flattenText';
import { useTextSwap, commonAffixes } from './useTextSwap';
import type { TextAnimationContext } from '../types';
import type { TextRevealOptions } from './types';
import { motionDefaults } from '../../../../core/base/motion-config';
import styles from './TextReveal.module.scss';
import { TextRevealLayer } from './TextRevealLayer/TextRevealLayer';
import { useMotionTime } from '../../../../hooks/useMotionTime';
// Incoming letters start after outgoing letters have begun to leave.
const IN_DELAY_FACTOR = motionDefaults.textReveal.inDelayFactor;
const COLLAPSE_SIZE_DELAY_FACTOR = motionDefaults.textReveal.collapseDelayFactor;
/** Layout coordinates keep the wave stable under transformed ancestors. */
function applyWaveOrder(layer: Element) {
  const chars = layer.querySelectorAll<HTMLElement>('[data-reveal-char]');
  if (chars.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const items: { el: HTMLElement; x: number; y: number }[] = [];

  chars.forEach((el) => {
    const x = el.offsetLeft;
    const y = el.offsetTop;
    items.push({ el, x, y });
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const range = maxX - minX + (maxY - minY) || 1;
  items.forEach(({ el, x, y }) => {
    const t = (x - minX + (y - minY)) / range;
    el.style.setProperty('--t', `${t}`);
  });
}

/** Character wave with transient size pinning; natural layout resumes after the swap. */
export function TextReveal({ content, options }: TextAnimationContext<TextRevealOptions>) {
  const text = flattenAnimatableText(content) ?? '';
  const viewportRef = useRef<HTMLSpanElement | null>(null);
  const duration = useMotionTime('textReveal', 'duration', viewportRef, options?.duration) / 1000;
  const stagger = useMotionTime('textReveal', 'stagger', viewportRef, options?.stagger) / 1000;
  const shift = options?.shift ?? motionDefaults.textReveal.shift;
  const maxDuration =
    useMotionTime('textReveal', 'maxDuration', viewportRef, options?.maxDuration) / 1000;
  const capSpan = (chars: number) =>
    Math.min(Math.max(0, chars - 1) * stagger, Math.max(0, maxDuration - duration));
  const effStagger = text.length > 1 ? capSpan(text.length) / (text.length - 1) : stagger;

  const { current, previous, generation } = useTextSwap(text, {
    durationMs: duration * 1000,
    staggerMs: effStagger * 1000,
  });
  const lastSizeRef = useRef<{ w: number; h: number } | null>(null);
  const swappingRef = useRef(false);
  const pinnedRef = useRef(false);
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    const view = vp.ownerDocument.defaultView;
    if (!view) return;
    const ro = new view.ResizeObserver((entries) => {
      if (swappingRef.current) return;
      const entry = entries[entries.length - 1];
      if (!entry) return;
      lastSizeRef.current = { w: entry.contentRect.width, h: entry.contentRect.height };
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);
  const span = capSpan(Math.max(current.length, previous?.length ?? 0));
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    if (previous === null) {
      swappingRef.current = false;
      if (pinnedRef.current) {
        pinnedRef.current = false;
        vp.style.transition = 'none';
        vp.style.width = '';
        vp.style.height = '';
        vp.style.whiteSpace = '';
        void vp.offsetWidth;
        vp.style.transition = '';
      }
      return undefined;
    }
    swappingRef.current = true;
    // Computed sizes exclude ancestor transforms; boundingClientRect does not.
    const rect = () => {
      const cs = vp.ownerDocument.defaultView?.getComputedStyle(vp);
      return { w: parseFloat(cs?.width ?? '') || 0, h: parseFloat(cs?.height ?? '') || 0 };
    };
    vp.style.transition = 'none';
    vp.style.width = '';
    vp.style.height = '';
    vp.style.whiteSpace = '';
    pinnedRef.current = false;

    const natural = rect();
    const words = vp.querySelectorAll<HTMLElement>('[data-reveal-mode="in"] .ui-reveal-word');
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    const wraps =
      firstWord !== undefined && lastWord !== undefined && lastWord.offsetTop > firstWord.offsetTop;
    const wasMultiline = lastSizeRef.current !== null && lastSizeRef.current.h > natural.h * 1.5;
    const multiline = wraps || wasMultiline;
    const to = natural;
    const from = lastSizeRef.current;
    lastSizeRef.current = to;

    // Shrinking waits for outgoing letters so the surface does not clip their wave.
    const collapsing = from !== null && to.h < from.h - 2;
    const sizeDelay = collapsing ? span * COLLAPSE_SIZE_DELAY_FACTOR : 0;
    vp.style.setProperty('--reveal-size-delay', `${sizeDelay}s`);
    if (from !== null && multiline) {
      const outLayer = vp.querySelector<HTMLElement>('[data-reveal-mode="out"]');
      if (outLayer) {
        outLayer.style.width = `${from.w}px`;
        outLayer.style.whiteSpace = 'normal';
      }
    }
    vp.querySelectorAll<HTMLElement>('[data-reveal-layer]').forEach((layer) => {
      applyWaveOrder(layer);
    });

    vp.style.transition = '';
    if (from === null || prefersReducedMotion(vp.ownerDocument.defaultView)) return undefined;
    const animW = Math.abs(from.w - to.w) > 0.5 && (!multiline || collapsing);
    const animH = Math.abs(from.h - to.h) > 0.5;
    const useNowrap = animW && !multiline; // nowrap только для однострочного глайда
    if (!animW && !animH) return undefined;
    vp.style.transition = 'none';
    if (useNowrap) vp.style.whiteSpace = 'nowrap';
    if (animW) vp.style.width = `${from.w}px`;
    if (animH) vp.style.height = `${from.h}px`;
    void vp.offsetWidth;
    vp.style.transition = '';
    pinnedRef.current = true;
    if (animW) vp.style.width = `${to.w}px`;
    if (animH) vp.style.height = `${to.h}px`;
    const releaseMs =
      (Math.max(sizeDelay, duration * IN_DELAY_FACTOR) + duration + span) * 1000 +
      MOTION_END_BUFFER_MS;
    const timer = setTimeout(() => {
      pinnedRef.current = false;
      vp.style.transition = 'none';
      vp.style.width = '';
      vp.style.height = '';
      vp.style.whiteSpace = '';
      void vp.offsetWidth;
      vp.style.transition = '';
    }, releaseMs);

    return () => clearTimeout(timer);
  }, [current, previous, duration, span]);

  const vars = {
    '--reveal-dur': `${duration}s`,
    '--reveal-span': `${span}s`,
    '--reveal-shift': `${shift}em`,
    '--reveal-width-dur': `${duration + span}s`,
    '--reveal-in-delay': `${duration * IN_DELAY_FACTOR}s`,
  } as CSSProperties;
  const affixes = previous !== null ? commonAffixes(previous, current) : { prefix: 0, suffix: 0 };

  return (
    <span ref={viewportRef} className={cx(styles.TextReveal, 'ui-reveal')} style={vars}>
      {previous !== null && (
        <TextRevealLayer
            key={`out-${generation}`}
            text={previous}
            mode="out"
            staticPrefix={affixes.prefix}
            staticSuffix={affixes.suffix}
        />
      )}

      <TextRevealLayer
          key={`in-${generation}`}
          text={current}
          mode={previous === null ? 'idle' : 'in'}
          staticPrefix={affixes.prefix}
          staticSuffix={affixes.suffix}
      />
    </span>
  );
}
