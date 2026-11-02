'use client';

import { useEffect, useRef, useState } from 'react';
import { MEDIA_QUERY } from '../../core';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { attachMarquee } from './Marquee.motion';
import type { MarqueeProps } from './Marquee.types';

/** Owns React visibility and copy count; the motion session owns listeners and frames. */
export function useMarquee({
  speed,
  reverse,
  paused,
  draggable,
}: Required<Pick<MarqueeProps, 'speed' | 'reverse' | 'paused' | 'draggable'>>) {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLElement>(null);
  const [copies, setCopies] = useState(2);
  const reduced = useMediaQuery(MEDIA_QUERY.reducedMotion);

  const live = useRef({ speed, reverse, paused, wake: () => {} });
  live.current.speed = speed;
  live.current.reverse = reverse;
  live.current.paused = paused;

  useEffect(() => live.current.wake(), [speed, reverse, paused]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track || reduced) return;

    return attachMarquee({ root, track, live, draggable, setCopies });
  }, [reduced, draggable]);

  return { rootRef, trackRef, copies };
}
