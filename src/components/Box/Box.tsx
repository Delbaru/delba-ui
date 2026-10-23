'use client';

import { type CSSProperties } from 'react';
import type React from 'react';
import { boxLayout, composeEventHandlers, containerClass, createLayoutClasses, cx, splitBoxLayout, stateLinkProps, useMergedRefs, type BoxLayoutProps, type ContainerProp, type ResponsiveValue, type StateLinkInput, type WithRef } from '../../core';
import { type RevealProps } from '../../core/reveal/reveal';
import { resolveContentAnimate, type ContentAnimate } from '../../hooks/contentMotion';
import { useContentMotion } from '../../hooks/useContentMotion';
import { isSharedMotionAnimate, useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { CollapseWrap, type CollapseOptions } from '../Collapse/CollapseWrap';

type JustifyContentKey = 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';

const c = createLayoutClasses();

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement>, BoxLayoutProps, ContainerProp, SharedMotionProps<ContentAnimate>, RevealProps {
  children?: React.ReactNode;
  style?: CSSProperties;

  /** Сворачивает весь Box по высоте; `open` управляется состоянием снаружи. */
  collapse?: CollapseOptions;

  /** Появление и смена содержимого: `animate="fadeIn"` — вход при монтировании,
   *  `animate={['fadeIn', { key: tab }]}` — при смене `key` старое уходит зеркальным ходом, затем
   *  входит новое. Узел тот же (ref и фокус сохраняются), reduced-motion меняет сразу. */
  animate?: SharedMotionProps<ContentAnimate>['animate'];

  justify?: ResponsiveValue<JustifyContentKey>;
  linkState?: StateLinkInput;
}

export function Box({
  ref,
  children,
  className = '',
  style,
  collapse,
  animate,
  perspective3d,
  parallax,
  reveal,
  justify,
  container,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onClick,
  onFocus,
  onBlur,
  onAnimationEnd,
  linkState,
  ...props
}: WithRef<BoxProps, HTMLDivElement>) {
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, reveal, animate });
  const contentAnimate = isSharedMotionAnimate(animate) ? undefined : animate;
  const contentMotion = useContentMotion({ ...resolveContentAnimate(contentAnimate), children, onAnimationEnd });
  const setRefs = useMergedRefs(setMotionNode, contentMotion.ref, ref);

  const content = (
    <div
      ref={setRefs}
      className={cx('ui-box', containerClass(container), ...layout, ...c.value('justify', justify), contentMotion.className, className)}
      style={{ ...(motionStyle ?? null), ...style }}
      {...revealAttrs}
      {...rest}
      {...stateLinkProps(linkState, {
        onMouseEnter: composeEventHandlers(motionHandlers?.onMouseEnter, onMouseEnter),
        onMouseMove: composeEventHandlers(motionHandlers?.onMouseMove, onMouseMove),
        onMouseLeave: composeEventHandlers(motionHandlers?.onMouseLeave, onMouseLeave),
        onMouseDown,
        onMouseUp,
        onClick,
        onFocus,
        onBlur,
      })}
      onAnimationEnd={contentMotion.onAnimationEnd}
    >
      {contentMotion.children}
    </div>
  );

  if (!collapse) return content;
  return <CollapseWrap {...collapse} clip={box.minH != null}>{content}</CollapseWrap>;
}
