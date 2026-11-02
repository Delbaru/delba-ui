'use client';

import Link from 'next/link';
import { useMemo, type CSSProperties } from 'react';
import type React from 'react';
import { boxLayout, cx, createLayoutClasses, resolveRadiusInput, shouldUseNextLink, splitBoxLayout, splitRootDomProps, stateProps as buildStateProps, stateLinkProps, type WithRef, composeEventHandlers, useMergedRefs } from '../../core';
import { Flex } from '../Flex';
import { CollapseWrap } from '../Collapse/CollapseWrap';
import { isSharedMotionAnimate, useSharedMotion } from '../../hooks/useSharedMotion';
import { useIconTooltip } from './IconTooltip/IconTooltip';
import { hasIconSource, parseAspectRatio, resolveIconSource } from './svg';
import { useIconSwap, componentSwapKey } from './swap';
import { useFetchedSvg } from './useFetchedSvg';

const c = createLayoutClasses();

export type { IconProps } from './Icon.types';
import type { IconProps, IconElementProps } from './Icon.types';
import { IconGlyph } from './IconGlyph/IconGlyph';
import styles from './Icon.module.scss';
import { iconStyles } from './Icon.config';

export function Icon({
  ref,
  src,
  name,
  hover,
  component: IconComponent,
  href,
  target,
  rel,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-disabled': ariaDisabled,
  'data-point-events': dataPointEvents,
  className = '',
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  role,
  tabIndex,
  w,
  minW,
  maxW,
  h,
  minH,
  maxH,
  rotate,
  m,
  mt,
  mr,
  mb,
  ml,
  grow,
  r,
  tlr,
  trr,
  brr,
  blr,
  borderTLR,
  borderTRR,
  borderBRR,
  borderBLR,
  color,
  fill,
  stroke,
  strokeWidth,
  border,
  borderC,
  borderS,
  borderW,
  borderT,
  borderR,
  borderB,
  borderL,
  state,
  rootW,
  rootMinW,
  rootMaxW,
  rootH,
  rootMinH,
  rootMaxH,
  rootR,
  rootTLR,
  rootTRR,
  rootBRR,
  rootBLR,
  rootBg,
  rootClassName,
  tooltip,
  tooltipDirection = 'right',
  tooltipGap = 8,
  linkState,
  perspective3d,
  parallax,
  animate,
  collapse,
  ...rest
}: WithRef<IconProps, SVGSVGElement>) {
  const { box, rest: props } = splitBoxLayout(rest);
  const linkRel = rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined);
  const useNextLink = shouldUseNextLink(href, target);
  // Подсказка якорится к ВНЕШНЕМУ узлу иконки: ссылке, если она есть, иначе к корню контента.
  const {
    setAnchor: setTooltipAnchor,
    handlers: tooltipHandlers,
    bubble: tooltipBubble,
    describedBy: tooltipDescription,
  } = useIconTooltip(tooltip, tooltipDirection, tooltipGap);
  const hasTooltip = Boolean(tooltip);
  const describedBy = [ariaDescribedBy, tooltipDescription].filter(Boolean).join(' ') || undefined;
  const linkProps = href
    ? {
        href,
        target,
        rel: linkRel,
        className: cx('ui-icon-link', ...boxLayout(c, box), hasTooltip && 'ui-icon-tooltip-anchor'),
        id,
        role,
        tabIndex,
        'aria-label': ariaLabel,
        'aria-disabled': ariaDisabled,
        'data-point-events': dataPointEvents,
        'aria-describedby': describedBy,
        ref: setTooltipAnchor,
        ...tooltipHandlers,
        onFocus: composeEventHandlers(onFocus, tooltipHandlers.onFocus),
        onBlur: composeEventHandlers(onBlur, tooltipHandlers.onBlur),
      }
    : null;
  const rootTooltipHandlers = linkProps ? undefined : tooltipHandlers;
  const wrapLink = (content: React.ReactNode) =>
    linkProps ? (useNextLink ? <Link {...linkProps}>{content}</Link> : <a {...linkProps}>{content}</a>) : content;

  const baseSource = resolveIconSource({ src, name, component: IconComponent });
  const hoverSource = resolveIconSource(hover);
  const iconUrl = baseSource.url;
  const hoverUrl = hoverSource.url;
  const hasHoverIcon = hasIconSource(hoverSource);
  const iconSizeProps = {
    w,
    minW,
    maxW,
    h,
    minH,
    maxH,
  };
  const rootSizeProps = {
    w: rootW,
    minW: rootMinW,
    maxW: rootMaxW,
    h: rootH,
    minH: rootMinH,
    maxH: rootMaxH,
  };
  const resolvedRadiusProps = resolveRadiusInput({ r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR });
  const resolvedRootRadius = resolveRadiusInput({
    r: rootR ?? resolvedRadiusProps.r,
    tlr: rootTLR ?? resolvedRadiusProps.tlr,
    trr: rootTRR ?? resolvedRadiusProps.trr,
    brr: rootBRR ?? resolvedRadiusProps.brr,
    blr: rootBLR ?? resolvedRadiusProps.blr,
  });
  const resolvedRootBg = rootBg;
  const resolvedRootClassName = rootClassName;
  const { rootProps, elementProps: rawElementProps } = splitRootDomProps(props as IconElementProps);
  const {
    tooltip: _tooltip,
    tooltipDirection: _tooltipDirection,
    tooltipGap: _tooltipGap,
    ...elementProps
  } = rawElementProps;

  const { rotation: rotateVars, strokeWidths: strokeWidthVars, paint: commonSvgStyle } =
    iconStyles.resolve({ rotate, strokeWidth, color, fill, stroke });

  const shouldNormalizeFetchedSvg = fill != null || stroke != null || strokeWidth != null;
  const { content: svgContent, viewBox: svgViewBox, rootFill: svgRootFill } = useFetchedSvg(iconUrl, shouldNormalizeFetchedSvg);
  const { content: hoverSvgContent, viewBox: hoverSvgViewBox, rootFill: hoverSvgRootFill } = useFetchedSvg(hoverUrl, shouldNormalizeFetchedSvg);

  // Stable innerHTML preserves path nodes and their active CSS transitions.
  const svgHtml = useMemo(() => ({ __html: svgContent ?? '' }), [svgContent]);
  const hoverSvgHtml = useMemo(() => ({ __html: hoverSvgContent ?? '' }), [hoverSvgContent]);
  const rootStateProps = buildStateProps(state);
  const contentAnimate = isSharedMotionAnimate(animate) ? undefined : animate;
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });
  // Пользовательский обработчик первым, внутренние (моушен, подсказка) — следом и без отмены:
  // preventDefault снаружи не должен оставить подсказку висеть или моушен недоигранным.
  const linkedHandlers = stateLinkProps(linkState, {
    onClick,
    onMouseEnter: composeEventHandlers(composeEventHandlers(onMouseEnter, motionHandlers?.onMouseEnter), rootTooltipHandlers?.onMouseEnter),
    onMouseLeave: composeEventHandlers(composeEventHandlers(onMouseLeave, motionHandlers?.onMouseLeave), rootTooltipHandlers?.onMouseLeave),
    onMouseMove: composeEventHandlers(onMouseMove, motionHandlers?.onMouseMove),
    onMouseDown,
    onMouseUp,
    onFocus: href ? undefined : composeEventHandlers(onFocus, rootTooltipHandlers?.onFocus),
    onBlur: href ? undefined : composeEventHandlers(onBlur, rootTooltipHandlers?.onBlur),
    onKeyDown,
    onKeyUp,
  });
  const needsRootWrapper = [
    rootSizeProps.w,
    rootSizeProps.minW,
    rootSizeProps.maxW,
    rootSizeProps.h,
    rootSizeProps.minH,
    rootSizeProps.maxH,
    border,
    borderC,
    borderS,
    borderW,
    borderT,
    borderR,
    borderB,
    borderL,
    resolvedRootRadius.r,
    resolvedRootRadius.tlr,
    resolvedRootRadius.trr,
    resolvedRootRadius.brr,
    resolvedRootRadius.blr,
    resolvedRootBg,
    resolvedRootClassName,
  ].some((value) => value !== undefined) || isSharedMotionAnimate(animate);
  const contentHandlers = needsRootWrapper ? undefined : linkedHandlers;
  // motionStyle уже собран useSharedMotion (transform + preserve-3d + willChange) — когда есть
  // root-обёртка, моушен живёт на ней, иначе вешаем его прямо на контент.
  const contentMotionStyle = needsRootWrapper ? undefined : motionStyle;
  const contentRootProps = needsRootWrapper ? undefined : rootProps;
  const wrapperRootProps = needsRootWrapper ? rootProps : undefined;
  const contentInteractiveProps = !needsRootWrapper && !href
    ? {
        id,
        role,
        tabIndex,
        'aria-label': ariaLabel,
        'aria-describedby': describedBy,
        'aria-disabled': ariaDisabled,
      }
    : undefined;
  const rootInteractiveProps = needsRootWrapper && !href
    ? {
        id,
        role,
        tabIndex,
        'aria-label': ariaLabel,
        'aria-describedby': describedBy,
        'aria-disabled': ariaDisabled,
      }
    : undefined;

  // Коробка глифа: поля, радиус, размер. grow — у глифа, только когда нет root-обёртки (иначе он у неё).
  const glyphLayout = boxLayout(c, { ...(!needsRootWrapper && !linkProps ? box : {}), m, mt, mr, mb, ml, ...resolvedRadiusProps, ...iconSizeProps, grow: needsRootWrapper ? undefined : grow });
  const commonClasses = [...glyphLayout, className];

  const commonStyles = {
    ...(strokeWidthVars as CSSProperties),
    ...(rotateVars as CSSProperties),
    ...style,
  };

  const stackAspectRatio = parseAspectRatio(svgViewBox || elementProps.viewBox || hoverSvgViewBox);

  // The public ref belongs to the glyph; motion/tooltip attach to one outer node.
  const motionOnGlyph = !needsRootWrapper && !hasHoverIcon;
  const setSvgRefs = useMergedRefs(ref, motionOnGlyph ? setMotionNode : undefined, motionOnGlyph && !linkProps ? setTooltipAnchor : undefined);
  const setStackRef = useMergedRefs(needsRootWrapper ? undefined : setMotionNode, needsRootWrapper || linkProps ? undefined : setTooltipAnchor);
  const setRootRef = useMergedRefs<HTMLDivElement>(setMotionNode, linkProps ? undefined : setTooltipAnchor);

  const glyphProps = {
    ...(contentInteractiveProps ?? null),
    ...(contentRootProps as Record<string, unknown> ?? null),
    'data-point-events': dataPointEvents,
    'data-icon-root': 'true',
    ...(!needsRootWrapper ? revealAttrs : null),
    className: cx('Icon', styles.Icon, 'ui-icon', ...commonClasses),
    style: { ...commonSvgStyle, ...commonStyles, ...(contentMotionStyle ?? null) },
    ...rootStateProps,
    ...contentHandlers,
    ...elementProps,
  };

  let content: React.ReactElement | null = hasHoverIcon ? (
    <span
        ref={setStackRef}
        {...(contentInteractiveProps ?? null)}
        {...(contentRootProps as Record<string, unknown> ?? null)}
        data-point-events={dataPointEvents}
        {...rootStateProps}
        className={cx('Icon', styles.Icon, 'ui-icon-wrapper', ...commonClasses)}
        style={{ ...(stackAspectRatio ? { aspectRatio: stackAspectRatio } : null), ...commonStyles, ...(contentMotionStyle ?? null) }}
        {...contentHandlers}
        {...(!needsRootWrapper ? revealAttrs : null)}
        data-icon-root="true"
        data-icon-stack="true"
    >
      <IconGlyph
          ref={setSvgRefs}
          source={baseSource}
          fetched={{ content: svgContent, viewBox: svgViewBox, rootFill: svgRootFill }}
          html={svgHtml}
          fill={fill}
          hiddenUntilReady
          svgProps={{ 'data-icon-layer': 'default', ...(!needsRootWrapper ? revealAttrs : null), className: 'ui-icon', style: commonSvgStyle, ...elementProps }}
      />
      <IconGlyph
          source={hoverSource}
          fetched={{ content: hoverSvgContent, viewBox: hoverSvgViewBox, rootFill: hoverSvgRootFill }}
          html={hoverSvgHtml}
          fill={fill}
          hiddenUntilReady
          svgProps={{ 'data-icon-layer': 'hover', className: 'ui-icon', style: commonSvgStyle, 'aria-hidden': true }}
      />
    </span>
  ) : (
    <IconGlyph
        ref={setSvgRefs}
        source={baseSource}
        fetched={{ content: svgContent, viewBox: svgViewBox, rootFill: svgRootFill }}
        html={svgHtml}
        fill={fill}
        svgProps={glyphProps}
    />
  );

  // Идентичность источника для свопа + признак готовности контента (для инлайн-иконок — синхронно).
  const iconIdentity = baseSource.url ?? (baseSource.component ? componentSwapKey(baseSource.component) : null);
  const iconContentReady = svgContent != null || Boolean(baseSource.component);

  // Root-бокс (заливка/бордер/размер) — часть визуала иконки, поэтому собираем его ДО свопа, чтобы
  // анимировался весь отрисованный Icon целиком (кружок + глиф), а не только SVG внутри коробки.
  if (needsRootWrapper) {
    content = (
      <Flex
        ref={setRootRef}
        {...(rootInteractiveProps ?? null)}
        {...(wrapperRootProps as Record<string, unknown> ?? null)}
        data-point-events={dataPointEvents}
        data-icon-root="true"
        className={cx(
          'Icon', styles.Icon, 'ui-icon-root',
          hasTooltip && 'ui-icon-tooltip-anchor',
          resolvedRootClassName,
          ...c.value('bg', resolvedRootBg),
        )}
        w={rootSizeProps.w}
        minW={rootSizeProps.minW}
        maxW={rootSizeProps.maxW}
        h={rootSizeProps.h}
        minH={rootSizeProps.minH}
        maxH={rootSizeProps.maxH}
        r={resolvedRootRadius.r}
        tlr={resolvedRootRadius.tlr}
        trr={resolvedRootRadius.trr}
        brr={resolvedRootRadius.brr}
        blr={resolvedRootRadius.blr}
        border={border}
        borderC={borderC}
        borderS={borderS}
        borderW={borderW}
        borderT={borderT}
        borderR={borderR}
        borderB={borderB}
        borderL={borderL}
        grow={grow}
        state={state}
        align={["center", "center", "center"]}
        justify={["center", "center", "center"]}
        {...revealAttrs}
        style={motionStyle as CSSProperties | undefined}
        {...linkedHandlers}
      >
        {content}
      </Flex>
    );
  }

  // Swap includes the configured root, not only the glyph.
  content = useIconSwap(contentAnimate, iconIdentity, iconContentReady, content) as React.ReactElement | null;

  if (!hasIconSource(baseSource) || !content) return null;

  // Форма дерева не зависит от `tooltip`: портал — второй ребёнок того же фрагмента, поэтому
  // появление и уход подсказки не пересоздают узел иконки.
  const result = (
    <>
      {wrapLink(content)}
      {tooltipBubble}
    </>
  );

  if (!collapse) return result;
  return <CollapseWrap {...collapse} as="span" inline axis={collapse.axis ?? 'column'}>{result}</CollapseWrap>;
}
