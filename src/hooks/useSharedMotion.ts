'use client';

import { useCallback, type CSSProperties } from 'react';

import type { RevealProps } from '../core/reveal/reveal';
import { useParallaxMotion, type ParallaxInput } from './useParallaxMotion';
import { usePerspective3dMotion, type Perspective3dInput } from './usePerspective3dMotion';
import { useReveal } from './useReveal';

type MotionTarget = HTMLElement | SVGElement;

export interface SharedMotionProps {
  perspective3d?: Perspective3dInput;
  parallax?: ParallaxInput;
}

// `reveal` — не в SharedMotionProps: его принимают только примитивы раскладки и Img, остальные
// компоненты молча проглотили бы проп из общего типа.
export function useSharedMotion({ perspective3d, parallax, reveal }: SharedMotionProps & RevealProps) {
  const {
    isEnabled: hasPerspective3d,
    motionHandlers,
    motionStyle: perspectiveStyle,
    setMotionNode: setPerspectiveNode,
    transformValue: perspectiveTransform,
  } = usePerspective3dMotion(perspective3d);

  const {
    isEnabled: hasParallax,
    motionStyle: parallaxStyle,
    setMotionNode: setParallaxNode,
    transformValue: parallaxTransform,
  } = useParallaxMotion(parallax);

  const { revealAttrs, revealStyle, setRevealNode } = useReveal(reveal);

  const motionTransform = [parallaxTransform, perspectiveTransform].filter(Boolean).join(' ');
  const hasMotion = hasPerspective3d || hasParallax;

  // Ход появления — отдельными `translate`/`scale`/`opacity`/`filter`, поэтому складывается с
  // `transform` параллакса и наклона на том же узле, а не затирает его.
  const motionStyle = hasMotion || revealStyle
    ? ({
        ...(revealStyle ?? null),
        ...(perspectiveStyle ?? null),
        ...(parallaxStyle ?? null),
        ...(motionTransform
          ? {
              transform: motionTransform,
              ...(hasPerspective3d ? { transformStyle: 'preserve-3d' } : null),
              willChange: 'transform',
            }
          : null),
      } as CSSProperties)
    : undefined;

  // Оба вложенных setter'а стабильны, поэтому стабилен и общий — иначе ref-колбэк потребителя
  // менял бы идентичность каждый рендер и React передёргивал бы ref, сбрасывая моушен в ноль.
  const setMotionNode = useCallback((node: MotionTarget | null) => {
    setPerspectiveNode(node);
    setParallaxNode(node);
    setRevealNode(node);
  }, [setPerspectiveNode, setParallaxNode, setRevealNode]);

  return {
    hasMotion,
    motionHandlers,
    motionStyle,
    /** Атрибуты `data-reveal*` для корня: по ним CSS прячет элемент ещё в серверном HTML. */
    revealAttrs,
    setMotionNode,
  };
}