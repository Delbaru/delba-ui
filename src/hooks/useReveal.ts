'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import { armReveal, releaseReveal } from '../core/reveal/observer';
import { resolveReveal, revealAttrs, revealSignature, revealStyle, type RevealInput } from '../core/reveal/reveal';

/**
 * Появление по скроллу для корня примитива: атрибуты и переменные — в рендер (их видит серверный
 * HTML), наблюдение — после монтирования. `setRevealNode` — ref-колбэк корня, стабильный.
 */
export function useReveal(input: RevealInput | undefined) {
  const config = resolveReveal(input);
  const signature = revealSignature(config);
  const nodeRef = useRef<HTMLElement | null>(null);
  const configRef = useRef(config);

  useLayoutEffect(() => {
    configRef.current = config;
  });

  // Подключение переживает рендеры: перевешивается только при смене опций.
  useLayoutEffect(() => {
    const node = nodeRef.current;
    const current = configRef.current;
    if (!node || !current) return undefined;
    armReveal(node, current);
    return () => releaseReveal(node);
  }, [signature]);

  const setRevealNode = useCallback((node: Element | null) => {
    nodeRef.current = node instanceof HTMLElement ? node : null;
  }, []);

  return { revealAttrs: revealAttrs(config), revealStyle: revealStyle(config), setRevealNode };
}
