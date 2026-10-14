'use client';
'use no memo';

import Link from 'next/link';
import type React from 'react';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { boxLayout, buildClampStyle, composeInteractionHandlers, createLayoutClasses, cx, normalizeComponentState, resolveLinkProps, shouldUseNextLink, splitBoxLayout, stateLinkProps, useMergedRefs, type BoxLayoutProps, type ComponentStateValue, type ResponsiveInput, type ResponsiveValue, type StateLinkInput, type WithRef } from '../../core';
import type { TextRole, TextVariantName } from '../../core/base/typography';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { CollapseWrap, type CollapseOptions } from '../Collapse/CollapseWrap';
import { resolveAnimation } from './animations/resolveAnimation';
import type { AnimationInput, TextAnimate } from './animations/types';
import { isTextTimeline } from './animations/timeline';
import { useTextTimeline } from './animations/useTextTimeline';
import type { LineHeightValue } from './typography';
import { resolveTextContent, type TextFormat } from './formatContent';
import { bindTextContent } from './nonBreaking';
import { isAppearanceAnimate, type AppearanceAnimate } from '../../core/reveal/reveal';

/**
 * Вариант проекта (`UiTypography`), служебная роль кита или 'inherit' — не навязывать типографику:
 * для Text внутри Text (цветные куски чужого заголовка).
 */
type VariantKey = TextVariantName | TextRole | 'inherit';
type FontFamilyKey = 'primary' | 'secondary' | 'inherit';
type TextAlignValue = 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
type WhiteSpaceValue = 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces';

const c = createLayoutClasses();

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
    Omit<BoxLayoutProps, 'aspectRatio'>,
    SharedMotionProps<ResponsiveInput<AnimationInput> | TextAnimate> {
  children?: React.ReactNode;
  style?: CSSProperties;
  format?: ResponsiveValue<TextFormat>;
  /** Появление, эффект текста или композиция: `{ when: 'inView', effect: { up: {}, counter: { to: 100 } } }`. */
  animate?: AppearanceAnimate | ResponsiveInput<AnimationInput> | TextAnimate;
  required?: boolean;

  newTab?: boolean;
  nofollow?: boolean;
  noreferrer?: boolean;

  as?: keyof React.JSX.IntrinsicElements;
  variant?: ResponsiveValue<VariantKey>;
  animation?: ResponsiveInput<AnimationInput>;
  /** Сворачивание текста с сохранением содержимого до конца анимации закрытия. Для блочного текста. */
  collapse?: CollapseOptions;

  /** Размер в rpx либо CSS-длина (`min(…, 10svh)`, `var(…)`); поверх variant. */
  fontSize?: ResponsiveValue<number | string>;
  fontWeight?: ResponsiveValue<number>;
  lineHeight?: ResponsiveValue<LineHeightValue>;
  fontFamily?: ResponsiveValue<FontFamilyKey>;

  color?: string;
  textTransform?: ResponsiveValue<string>;
  /** Межбуквенный интервал: число в rpx либо CSS-длина, например '-0.03em'. */
  letterSpacing?: ResponsiveValue<number | string>;
  textAlign?: ResponsiveValue<TextAlignValue>;
  whiteSpace?: ResponsiveValue<WhiteSpaceValue>;
  rows?: ResponsiveValue<number>;
  ellipsis?: boolean;

  state?: ComponentStateValue;

  linkState?: StateLinkInput;
}

export function Text({
  ref,
  as = 'div',
  variant = ['body', 'body', 'body'],
  animation,
  animate,
  collapse,
  fontSize,
  fontWeight,
  lineHeight,
  fontFamily,
  perspective3d,
  parallax,
  color,
  textTransform,
  letterSpacing,
  textAlign,
  whiteSpace,
  rows,
  ellipsis,
  state,
  className = '',
  style,
  children,
  format = ['default', 'default', 'default'],
  required = false,
  linkState,
  onMouseEnter,
  onMouseLeave,
  ...props
}: WithRef<TextProps, HTMLElement>) {
  'use no memo';
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const aProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    download?: string | boolean;
    newTab?: boolean;
    nofollow?: boolean;
    noreferrer?: boolean;
  };
  const { href, target, rel, download, newTab, nofollow, noreferrer, ...anchorRestProps } = aProps;

  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });

  const internalRef = useRef<HTMLElement | null>(null);
  const setRef = useMergedRefs(internalRef, setMotionNode, ref);

  const hasChildren = children != null && children !== '' && children !== false;

  // Контент и анимация: формат строки → плагин анимации из реестра (или контент как есть).
  const content = resolveTextContent(children, format);
  const timelineInput = isTextTimeline(animate) ? animate : undefined;
  const timeline = useTextTimeline(timelineInput, content, internalRef);
  const contentAnimate = isAppearanceAnimate(animate) || timelineInput ? undefined : animate;
  const anim = resolveAnimation(animation ?? contentAnimate, content);

  // Классы и inline-стиль host'а — коробка из ядра (boxLayout), типографика здесь. Алгоритмика (letter-spacing,
  // формат, разбор анимации) вынесена в ./typography, ./formatContent, ./animations.
  const clampStyle = buildClampStyle(rows);
  const hasRows = rows !== undefined;
  const hasSingleLineEllipsis = Boolean(ellipsis) && !hasRows;

  const inline: CSSProperties = {
    ...clampStyle,
    ...(motionStyle ?? null),
    ...(timeline.style ?? null),
    ...(timelineInput && as === 'span' ? { display: 'inline-block' } : null),
  };

  const normalizedState = normalizeComponentState(state);
  const sharedHandlerProps = stateLinkProps(linkState, composeInteractionHandlers(motionHandlers, { ...rest, onMouseEnter, onMouseLeave }));

  const effectiveAs = href ? 'a' : as;
  const isAnchor = effectiveAs === 'a';
  const Comp = (isAnchor && shouldUseNextLink(href, target, download) ? Link : effectiveAs) as React.ElementType;
  const linkProps = isAnchor ? resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer }) : {};
  const anchorProps = isAnchor ? { ...anchorRestProps, ...linkProps } : rest;

  const coreClasses = [
    ...c.value('text', variant),
    ...c.value('fontSize', fontSize),
    ...c.value('fontWeight', fontWeight),
    ...c.value('lineHeight', lineHeight),
    ...c.value('fontFamily', fontFamily),
    ...c.value('textTransform', textTransform),
    ...c.value('letterSpacing', letterSpacing),
    ...c.value('textAlign', textAlign),
    ...c.value('whiteSpace', whiteSpace),
    ...layout,
    ...c.value('color', color),
  ];

  // clamp/ellipsis/required не сочетаются с анимациями — добавляем их только в неанимированном пути.
  const classNames = anim.active
    ? cx('ui-text', ...coreClasses, className)
    : cx(
        'ui-text',
        ...coreClasses,
        required && 'ui-text-required',
        hasRows && 'ui-text-clamp',
        hasSingleLineEllipsis && 'ui-text-ellipsis',
        className
      );

  if (!hasChildren && !collapse) return null;

  const textNode = (
    <Comp
        ref={setRef}
        {...(normalizedState ? { state: normalizedState } : undefined)}
        className={classNames}
        style={{ ...inline, ...style }}
        {...revealAttrs}
        {...timeline.attrs}
        {...anchorProps}
        {...sharedHandlerProps}
    >
      {timeline.hasCounter ? (
        <span className="ui-counter">
          <span aria-hidden className="ui-counter-reserve">{timeline.finalText}</span>
          <span ref={timeline.valueRef} className="ui-counter-value">{timeline.finalText}</span>
        </span>
      ) : anim.active && anim.Inner ? <anim.Inner content={content} options={anim.options} /> : bindTextContent(content)}
    </Comp>
  );

  if (!collapse) return textNode;

  return (
    <CollapsibleText collapse={collapse} hasChildren={hasChildren}>{textNode}</CollapsibleText>
  );
}

function CollapsibleText({ collapse, hasChildren, children }: {
  collapse: NonNullable<TextProps['collapse']>;
  hasChildren: boolean;
  children: React.ReactNode;
}) {
  // Ошибка может очиститься в тот же рендер, который закрывает блок. Держим прежний текст,
  // чтобы он уходил вместе с высотой, а не исчезал до начала анимации.
  const [lastChildren, setLastChildren] = useState<React.ReactNode>(hasChildren ? children : null);

  useLayoutEffect(() => {
    if (collapse.open !== false && hasChildren) setLastChildren(children);
  }, [collapse.open, hasChildren, children]);

  return (
    <CollapseWrap {...collapse} clip>
      {hasChildren ? children : lastChildren}
    </CollapseWrap>
  );
}
