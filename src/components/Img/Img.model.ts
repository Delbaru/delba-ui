'use client';

import Link from 'next/link';
import { useRef, useState, type ElementType, type HTMLAttributes } from 'react';
import {
  boxLayout, createLayoutClasses, cx, resolveLinkProps, shouldUseNextLink,
  splitBoxLayout, splitRootDomProps, stateLinkProps, useMergedRefs, type WithRef,
} from '../../core';
import { isAppearanceAnimate } from '../../core/reveal/reveal';
import { isSharedMotionAnimate, useSharedMotion } from '../../hooks/useSharedMotion';
import { useFancybox } from '../../hooks/useFancybox';
import { prepareImage } from './Img.resource';
import type { ImgProps } from './Img.types';
import styles from './Img.module.scss';

const classes = createLayoutClasses();

export function useImg(props: WithRef<ImgProps, HTMLSpanElement>) {
  const { box, rest } = splitBoxLayout(props);
  const {
    ref, id, className, style, 'data-point-events': pointEvents,
    src, alt, animate, objectFit, objectPosition, rootW, rootH,
    sizes, sizesWidth, sizesHeight, blur, quality, priority, loading, fetchPriority,
    onLoad, onError, linkState, perspective3d, parallax, fancybox,
    href, target, rel, download, newTab, nofollow, noreferrer, ...native
  } = rest;
  const { rootProps, elementProps } = splitRootDomProps(native);
  const resource = prepareImage(props, box, elementProps);
  const appearance = isAppearanceAnimate(animate) ? { ...animate, stagger: 0 } : undefined;
  const motion = useSharedMotion({
    perspective3d, parallax,
    animate: appearance ?? (isSharedMotionAnimate(animate) ? animate : undefined),
  });
  const mergedRef = useMergedRefs(motion.setMotionNode, ref);
  const Root: ElementType = href ? (shouldUseNextLink(href, target, download) ? Link : 'a') : 'span';
  const link = href ? resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer }) : null;
  const group = href ? undefined : fancybox?.trim();
  const lightbox = group ? { href: resource.identity, group, label: resource.image.alt || 'Изображение' } : null;
  useFancybox(Boolean(lightbox?.href));

  const currentIdentity = useRef(resource.identity);
  currentIdentity.current = resource.identity;
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  function ready() {
    if (currentIdentity.current === resource.identity) setLoadedIdentity(resource.identity);
  }

  return {
    Root, resource, lightbox, blur, ready,
    loaded: loadedIdentity === resource.identity,
    change: isSharedMotionAnimate(animate) ? undefined : animate,
    imageClassName: cx('ui-img-image', ...classes.value('objectFit', objectFit ?? 'cover'),
      ...classes.value('objectPosition', objectPosition ?? 'center')),
    root: {
      ...(rootProps as HTMLAttributes<HTMLSpanElement>), ...link,
      ...stateLinkProps(linkState, motion.motionHandlers), ...motion.revealAttrs,
      ref: mergedRef, id, 'data-point-events': pointEvents,
      className: cx('Img', styles.Img, 'ui-img', ...boxLayout(classes, {
        ...box, w: rootW ?? box.w, h: rootH ?? box.h,
      }), className),
      style: { ...motion.motionStyle, ...style },
    },
  };
}
