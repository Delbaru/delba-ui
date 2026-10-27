'use client';

import { useCallback, useEffect, useRef } from 'react';
import { animationVisibilityMargin } from '../core/base/animation-visibility';

type AnimationNode = HTMLElement | SVGElement;
const PROPERTY = '--idle-animation-state';

/** Stable DOM ref for continuous CSS animations. Use `animation-play-state: var(--idle-animation-state, running)`.
 * Pauses offscreen or in a hidden document without React updates; disabling restores the previous inline value. */
export function useAnimationVisibility(enabled = true) {
  const nodeRef = useRef<AnimationNode | null>(null);
  const enabledRef = useRef(enabled);
  const cleanupRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    const node = nodeRef.current;
    if (!node || !enabledRef.current) return;

    const previous = node.style.getPropertyValue(PROPERTY);
    let visible = typeof IntersectionObserver === 'undefined';
    const update = () => node.style.setProperty(PROPERTY, visible && !document.hidden ? 'running' : 'paused');
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      update();
    }, { rootMargin: animationVisibilityMargin(node) });
    observer?.observe(node);
    document.addEventListener('visibilitychange', update);
    update();

    cleanupRef.current = () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
      if (previous) node.style.setProperty(PROPERTY, previous);
      else node.style.removeProperty(PROPERTY);
    };
  }, []);

  const setNode = useCallback((node: AnimationNode | null) => {
    if (nodeRef.current === node) return;
    nodeRef.current = node;
    connect();
  }, [connect]);

  useEffect(() => {
    enabledRef.current = enabled;
    connect();
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [enabled, connect]);

  return setNode;
}
