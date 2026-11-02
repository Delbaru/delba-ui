'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { MOTION_END_BUFFER_MS, prefersReducedMotion, readMotionMs } from '../core';

/** Presence only: the owner supplies open and owns focus/inert; shared motion supplies the effect. */
export function useOpenPresence(open: boolean, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [retained, setRetained] = useState(open);

  useLayoutEffect(() => {
    if (!enabled || open) {
      setRetained(open);
      return;
    }
    const node = ref.current;
    const view = node?.ownerDocument.defaultView;
    if (!node || !view || !retained) return;
    if (prefersReducedMotion(view)) {
      setRetained(false);
      return;
    }
    let active = true;
    const finish = () => { if (active) setRetained(false); };
    const animations = node.getAnimations().filter((animation) => {
      const end = animation.effect?.getComputedTiming().endTime;
      return animation.playState !== 'finished' && typeof end === 'number' && Number.isFinite(end);
    });
    const duration = Math.max(readMotionMs(node), readMotionMs(node, 'animation'));
    if (!animations.length && duration === 0) { finish(); return; }
    const timer = view.setTimeout(finish, duration + MOTION_END_BUFFER_MS);
    if (animations.length) void Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
    return () => { active = false; view.clearTimeout(timer); };
  }, [open, enabled, retained]);

  return { ref, present: open || retained };
}
