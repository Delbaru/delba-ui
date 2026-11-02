'use client';

import { useLayoutEffect, useRef } from 'react';
import type { TabTrackThumb } from './TabTrack';

const ACTIVE = "[state~='active']";
const BODY_WIDTH = 100;
const SEAM = 1;
/** Offset-parent coordinates exclude transforms on the enclosing surface. */
function offsetWithin(node: HTMLElement, track: HTMLElement) {
  let x = 0;
  let y = 0;
  let el: HTMLElement | null = node;

  while (el && el !== track) {
    x += el.offsetLeft;
    y += el.offsetTop;
    el = el.offsetParent as HTMLElement | null;
  }

  return { x, y };
}

/** Measures the active item in layout coordinates; paints one compositor-driven thumb. */
export function useTabTrack(value: string | null, thumb: TabTrackThumb) {
  const trackRef = useRef<HTMLElement>(null);
  const thumbRef = useRef<HTMLElement>(null);
  const placedRef = useRef(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const knob = thumbRef.current;
    if (!track || !knob) return;
    const view = track.ownerDocument.defaultView;
    if (!view) return;

    const [start, body, end] = Array.from(knob.children) as HTMLElement[];
    if (!start || !body || !end) return;

    const active = track.querySelector<HTMLElement>(ACTIVE);

    const place = () => {
      if (!active || active.offsetWidth === 0) {
        track.removeAttribute('data-thumb-ready');
        placedRef.current = false;
        return;
      }

      const instant = !placedRef.current;
      const { x, y } = offsetWithin(active, track);
      const w = active.offsetWidth;
      const h = active.offsetHeight;
      const corner =
        thumb === 'line' ? 0 : parseFloat(view.getComputedStyle(active).borderTopLeftRadius) || 0;
      const r = Math.min(corner, h / 2, w / 2);

      if (instant) track.setAttribute('data-thumb-instant', '');

      for (const part of [start, body, end]) part.style.height = `${h}px`;

      start.style.width = `${r + SEAM}px`;
      start.style.borderRadius = `${r}px 0 0 ${r}px`;
      start.style.transform = `translate(${x}px, ${y}px)`;

      end.style.width = `${r + SEAM}px`;
      end.style.borderRadius = `0 ${r}px ${r}px 0`;
      end.style.transform = `translate(${x + w - r - SEAM}px, ${y}px)`;

      body.style.width = `${BODY_WIDTH}px`;
      body.style.transform = `translate(${x + r}px, ${y}px) scaleX(${(w - 2 * r) / BODY_WIDTH})`;

      track.setAttribute('data-thumb-ready', '');

      if (instant) {
        track.getBoundingClientRect();
        track.removeAttribute('data-thumb-instant');
      }

      placedRef.current = true;
    };

    place();
    const observer = new view.ResizeObserver(place);
    observer.observe(track);
    if (active) observer.observe(active);

    return () => observer.disconnect();
  }, [value, thumb]);

  return { trackRef, thumbRef };
}
