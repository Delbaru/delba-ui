'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import { armReveal, releaseReveal } from '../core/reveal/observer';
import { resolveReveal, revealAttrs, revealSignature, revealStyle, type RevealInput } from '../core/reveal/reveal';

/**
 * Появление по скроллу для корня примитива: атрибуты и переменные — в рендер (их видит серверный
 * HTML), наблюдение — после монтирования. `setRevealNode` — ref-колбэк корня, стабильный.
 */
export function useReveal(input: RevealInput | undefined, phaseOpen?: boolean) {
  const config = resolveReveal(input);
  const signature = revealSignature(config);
  const controlled = phaseOpen !== undefined;
  const nodeRef = useRef<HTMLElement | null>(null);
  const configRef = useRef(config);
  const controlledRef = useRef(controlled);
  const interrupted = useRef<number | null>(null);
  const previousPhase = useRef(phaseOpen);

  // Read the old clock before the next layout effect flushes the new CSS animation.
  // A reverse command resumes at the same position instead of jumping to an endpoint.
  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!controlled || !node) return;
    const animation = node.getAnimations().find((item) => item instanceof CSSAnimation &&
      (item.animationName === 'ui-reveal' || item.animationName === 'ui-reveal-out'));
    const duration = animation?.effect?.getComputedTiming().duration;
    const delay = animation?.effect?.getTiming().delay ?? 0;
    if (animation && typeof duration === 'number' && duration > 0 && interrupted.current !== null && previousPhase.current !== phaseOpen) {
      animation.currentTime = delay + duration * (1 - interrupted.current);
    }
    interrupted.current = null;
    previousPhase.current = phaseOpen;
    return () => {
      const time = animation?.currentTime;
      if ((animation?.playState === 'running' || animation?.playState === 'paused') && typeof time === 'number' && typeof duration === 'number' && duration > 0) {
        interrupted.current = Math.max(0, Math.min(1, (time - delay) / duration));
      }
    };
  }, [controlled, phaseOpen, signature]);

  useLayoutEffect(() => {
    configRef.current = config;
    controlledRef.current = controlled;
  });

  // Подключение переживает рендеры: перевешивается только при смене опций.
  useLayoutEffect(() => {
    const node = nodeRef.current;
    const current = configRef.current;
    if (!node || !current || controlled) return undefined;
    armReveal(node, current);
    return () => releaseReveal(node);
  }, [signature, controlled]);

  const setRevealNode = useCallback((node: Element | null) => {
    const next = node instanceof HTMLElement ? node : null;
    if (nodeRef.current === next) return;
    if (nodeRef.current) releaseReveal(nodeRef.current);
    nodeRef.current = next;
    if (next && configRef.current && !controlledRef.current) armReveal(next, configRef.current);
  }, []);

  const attrs = revealAttrs(config);
  if (attrs && controlled) attrs['data-reveal-state'] = phaseOpen ? 'in' : 'out';
  return { revealAttrs: attrs, revealStyle: revealStyle(config), setRevealNode };
}
