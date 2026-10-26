'use client';

import { useCallback, type CSSProperties } from 'react';

import { isOpenAnimate, resolveRevealInput, type AppearanceAnimate, type RevealProps } from '../core/reveal/reveal';
import { useParallaxMotion, type ParallaxInput } from './useParallaxMotion';
import { usePerspective3dMotion, type Perspective3dInput } from './usePerspective3dMotion';
import { useReveal } from './useReveal';
import { hoverMotionStyle, isHoverTransformAnimate, resolveHoverTransform, type HoverTransformAnimate, type HoverTransformOptions } from '../core/base/hover-motion';
import { isAppearanceAnimate } from '../core/reveal/reveal';
import { useHoverTransform } from './useHoverTransform';

type MotionTarget = HTMLElement | SVGElement;

export type SharedAnimate<LegacyAnimate = never> = (AppearanceAnimate & { hover?: HoverTransformOptions | false }) | HoverTransformAnimate | LegacyAnimate;

export function isSharedMotionAnimate(value: unknown): value is AppearanceAnimate | HoverTransformAnimate {
  return isAppearanceAnimate(value) || isHoverTransformAnimate(value);
}

export interface SharedMotionProps<LegacyAnimate = never> {
  perspective3d?: Perspective3dInput;
  parallax?: ParallaxInput;
  /** Общий эффект появления: `{ effect: 'up', when: 'inView', delay: 0.16 }`.
   * `when: 'load'` запускает CSS-эффект с первого кадра; прежние эффекты компонента сохраняются. */
  animate?: SharedAnimate<LegacyAnimate>;
}

// `reveal` — не в SharedMotionProps: его принимают только примитивы раскладки и Img, остальные
// компоненты молча проглотили бы проп из общего типа.
export function useSharedMotion<LegacyAnimate>({ perspective3d, parallax, reveal, animate, open }: SharedMotionProps<LegacyAnimate> & RevealProps & { open?: boolean }) {
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

  const openAnimation = isOpenAnimate(animate);
  const input = openAnimation ? { ...animate, stagger: 0, start: 'view' as const } : resolveRevealInput(animate, reveal);
  const { revealAttrs, revealStyle, setRevealNode } = useReveal(input, openAnimation ? Boolean(open) : undefined);

  const hover = resolveHoverTransform(animate);
  const setHoverNode = useHoverTransform(hover);

  const motionTransform = [parallaxTransform, perspectiveTransform, hover && 'var(--hover-motion-transform)'].filter(Boolean).join(' ');
  const hasMotion = hasPerspective3d || hasParallax || Boolean(hover);

  // Ход появления — отдельными `translate`/`scale`/`opacity`/`filter`, поэтому складывается с
  // `transform` параллакса и наклона на том же узле, а не затирает его.
  const motionStyle = hasMotion || revealStyle
    ? ({
        ...(revealStyle ?? null),
        ...(perspectiveStyle ?? null),
        ...(parallaxStyle ?? null),
        ...(hover ? hoverMotionStyle(hover) : null),
        ...(motionTransform
          ? {
              transform: motionTransform,
              ...(hasPerspective3d ? { transformStyle: 'preserve-3d' } : null),
              ...(hasPerspective3d || hasParallax ? { willChange: 'transform' } : null),
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
    setHoverNode(node);
  }, [setPerspectiveNode, setParallaxNode, setRevealNode, setHoverNode]);

  return {
    hasMotion,
    motionHandlers,
    motionStyle,
    /** Атрибуты `data-reveal*` для корня: по ним CSS прячет элемент ещё в серверном HTML. */
    revealAttrs: hover ? { ...revealAttrs, 'data-hover-motion': '' } : revealAttrs,
    setMotionNode,
  };
}
