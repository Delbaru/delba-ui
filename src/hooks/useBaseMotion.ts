'use client';

import { useCallback, type CSSProperties } from 'react';

import { isOpenAnimate, resolveAppearanceAnimate, type AppearanceAnimate, type OpenAnimate } from '../core/reveal/reveal';
import { useParallaxMotion, type ParallaxInput } from './useParallaxMotion';
import { usePerspective3dMotion, type Perspective3dInput } from './usePerspective3dMotion';
import { useReveal } from './useReveal';
import { hoverMotionStyle, type HoverTransformOptions } from '../core/base/hover-motion';
import { useHoverTransform } from './useHoverTransform';
import { cx } from '../core/base/cn';
import hoverStyles from '../core/Motion/HoverMotion.module.scss';

type MotionTarget = HTMLElement | SVGElement;

export interface BaseMotionOptions {
  appearance?: AppearanceAnimate | OpenAnimate;
  hover?: HoverTransformOptions;
  perspective3d?: Perspective3dInput;
  parallax?: ParallaxInput;
  open?: boolean;
}

export function useBaseMotion({ perspective3d, parallax, appearance, hover, open }: BaseMotionOptions) {
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

  const openAnimation = isOpenAnimate(appearance);
  const input = openAnimation ? { ...appearance, stagger: 0, start: 'view' as const } : resolveAppearanceAnimate(appearance);
  const { revealClassName, revealAttrs, revealStyle, setRevealNode } = useReveal(input, openAnimation ? Boolean(open) : undefined);

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
    revealAttrs,
    motionClassName: cx(revealClassName, hover && hoverStyles.HoverMotion),
    setMotionNode,
  };
}
