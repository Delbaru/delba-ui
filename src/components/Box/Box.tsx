'use client';

import { type CSSProperties } from 'react';
import type React from 'react';
import { boxLayout, containerClass, createLayoutClasses, cx, splitBoxLayout, stateLinkProps, useMergedRefs, type BoxLayoutProps, type ContainerProp, type ResponsiveValue, type StateLinkInput, type WithRef } from '../../core';
import type { RevealProps } from '../../core/reveal/reveal';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';

type JustifyContentKey = 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';

const c = createLayoutClasses();

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement>, BoxLayoutProps, ContainerProp, SharedMotionProps, RevealProps {
  children?: React.ReactNode;
  style?: CSSProperties;

  justify?: ResponsiveValue<JustifyContentKey>;
  linkState?: StateLinkInput;
}

export function Box({
  ref,
  children,
  className = '',
  style,
  perspective3d,
  parallax,
  reveal,
  justify,
  container,
  onMouseEnter,
  onMouseLeave,
  linkState,
  ...props
}: WithRef<BoxProps, HTMLDivElement>) {
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, reveal });
  const setRefs = useMergedRefs(setMotionNode, ref);

  return (
    <div
      ref={setRefs}
      {...stateLinkProps(linkState, { onMouseEnter, onMouseLeave, ...motionHandlers })}
      className={cx('ui-box', containerClass(container), ...layout, ...c.value('justify', justify), className)}
      style={{ ...(motionStyle ?? null), ...style }}
      {...revealAttrs}
      {...rest}
    >
      {children}
    </div>
  );
}
