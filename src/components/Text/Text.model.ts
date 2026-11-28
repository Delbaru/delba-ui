'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import {
  boxLayout, buildClampStyle, createLayoutClasses, cx, normalizeComponentState,
  splitBoxLayout, type WithRef,
} from '#core';
import { useInteractiveElement } from '#core/Element';
import type { TextProps } from './Text.types';
import { DEFAULT_TEXT_VARIANT, TEXT_ONLY_HOSTS, TEXT_PHRASING_HOSTS } from './Text.config';
import { resolveAnimation, resolveTextOnlyAnimation } from './animations/resolveAnimation';
import { isTextTimeline } from './animations/timeline';
import { useTextTimeline } from './animations/useTextTimeline';
import { resolvePlainTextContent, resolveTextContent } from './formatContent';
import styles from './Text.module.scss';

const c = createLayoutClasses();

function hasTextContent(value: ReactNode) {
  return value != null && value !== '' && value !== false;
}

function useRetainedText(children: ReactNode, collapse: TextProps['collapse']) {
  const hasChildren = hasTextContent(children);
  const canCollapse = Boolean(collapse);
  const remember = canCollapse && collapse?.open !== false && hasChildren;
  const [previous, setPrevious] = useState<ReactNode>(canCollapse && hasChildren ? children : null);

  // A cleared field error still needs a text node while its collapse animates out.
  useLayoutEffect(() => {
    if (!canCollapse) setPrevious(null);
    else if (remember) setPrevious(children);
  }, [canCollapse, children, remember]);

  return hasChildren ? children : canCollapse ? previous : null;
}

export function useText({
  ref, as = 'div', variant = DEFAULT_TEXT_VARIANT, format, children,
  required, rows, ellipsis, animate, perspective3d, parallax, collapse, ui, linkState,
  fontSize, fontWeight, lineHeight, fontFamily, color, textTransform, letterSpacing,
  textAlign, whiteSpace, state, className, style, ...props
}: WithRef<TextProps, HTMLElement>) {
  const { box, rest } = splitBoxLayout(props);
  const hostTag = rest.href ? 'a' : as;
  const allowsPhrasing = TEXT_PHRASING_HOSTS.has(hostTag);
  const textOnly = TEXT_ONLY_HOSTS.has(hostTag);
  const textarea = hostTag === 'textarea';
  const retained = useRetainedText(children, collapse);
  const content = resolveTextContent(retained, format);
  const plainText = textOnly ? resolvePlainTextContent(content) : undefined;
  const timelineInput = isTextTimeline(animate?.appearance) ? animate.appearance : undefined;
  const timeline = useTextTimeline(timelineInput, plainText ?? content, allowsPhrasing);
  const animation = allowsPhrasing && !timelineInput ? resolveAnimation(animate, content) : undefined;
  const nativeText = plainText === undefined ? undefined : timeline.finalText ?? resolveTextOnlyAnimation(animate, plainText);
  const staticText = !animation?.active;
  const popup = collapse?.open === false ? undefined : ui?.popup;
  const element = useInteractiveElement({
    as,
    ref,
    refs: [timeline.ref],
    motion: {
      perspective3d,
      parallax,
      animate: allowsPhrasing ? animate : { ...animate, idle: undefined },
    },
    popup,
    linkState,
    style: {
      ...buildClampStyle(rows),
      ...timeline.style,
      ...(timelineInput && hostTag === 'span' ? { display: 'inline-block' } : undefined),
    },
    className: cx(
      styles.Text,
      timeline.className,
      ...boxLayout(c, box),
      ...c.value('text', variant),
      ...c.value('fontSize', fontSize),
      ...c.value('fontWeight', fontWeight),
      ...c.value('lineHeight', lineHeight),
      ...c.value('fontFamily', fontFamily),
      ...c.value('textTransform', textTransform),
      ...c.value('letterSpacing', letterSpacing),
      ...c.value('textAlign', textAlign),
      ...c.value('whiteSpace', whiteSpace),
      ...c.value('color', color),
      staticText && required && styles.Required,
      staticText && (rows !== undefined ? styles.Clamp : ellipsis && styles.Ellipsis),
      className,
    ),
    root: {
      ...timeline.attrs,
      ...rest,
      ...(textarea ? { defaultValue: rest.defaultValue ?? nativeText } : undefined),
      style,
      tabIndex: rest.tabIndex ?? (popup && popup.preset !== 'tooltip' && !rest.href ? 0 : undefined),
    },
  });

  return {
    ...element,
    root: { ...element.root, state: normalizeComponentState(state) },
    collapse: collapse && { ...collapse, clip: true },
    visible: hasTextContent(retained),
    content,
    nativeText: textarea ? null : nativeText,
    timelineCounter: timeline.counter,
    Inner: animation?.Inner,
    animationOptions: animation?.options,
  };
}
