'use client';

import type { CSSProperties } from 'react';
import { boxLayout, createLayoutClasses, cx, resolveRadiusInput, splitBoxLayout, splitRootDomProps, stateProps, type WithRef } from '#core';
import { useElement, type ElementEvents } from '#core/Element';
import { resolvePopupOptions, usePopup } from '../../core/Popup/Popup';
import { ICON_FRAME_LAYOUT, iconStyles } from './Icon.config';
import type { IconProps } from './Icon.types';
import { parseAspectRatio } from './svg';
import { useIconSources } from './useIconSources';
import styles from './Icon.module.scss';

const classes = createLayoutClasses();
type IconVisualNode = HTMLElement | SVGSVGElement;

export function useIcon(props: WithRef<IconProps, SVGSVGElement>) {
  const { box, rest } = splitBoxLayout(props);
  const {
    ref, src, name, component, hover, href, target, rel, ui, collapse,
    id, role, tabIndex, className, style, rotate, color, fill, stroke, strokeWidth, state,
    rootW, rootH, rootMinW, rootMaxW, rootMinH, rootMaxH, rootR, rootTLR, rootTRR, rootBRR, rootBLR,
    rootClassName, rootBg, perspective3d, parallax, animate, linkState,
    onClick, onMouseEnter, onMouseLeave, onMouseMove, onMouseDown, onMouseUp, onKeyDown, onKeyUp, onFocus, onBlur,
    'aria-label': label, 'aria-describedby': describedBy, 'aria-disabled': ariaDisabled,
    'data-point-events': pointEvents, ...native
  } = rest;
  const {
    w, minW, maxW, h, minH, maxH, r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR,
    m, mt, mr, mb, ml, grow, border, borderC, borderS, borderW, borderT, borderR, borderB, borderL, ...remainingBox
  } = box;
  const { rootProps, elementProps } = splitRootDomProps(native);
  const sources = useIconSources({
    src, name, component, hover,
    normalizePaint: fill != null || stroke != null || strokeWidth != null,
  });
  const { paint, rotation, strokeWidths } = iconStyles.resolve({ rotate, strokeWidth, color, fill, stroke });
  const iconRadius = resolveRadiusInput({ r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR });
  const frameLayout = {
    w: rootW, minW: rootMinW, maxW: rootMaxW, h: rootH, minH: rootMinH, maxH: rootMaxH,
    bg: rootBg, border, borderC, borderS, borderW, borderT, borderR, borderB, borderL,
    ...resolveRadiusInput({
      r: rootR ?? iconRadius.r, tlr: rootTLR ?? iconRadius.tlr, trr: rootTRR ?? iconRadius.trr,
      brr: rootBRR ?? iconRadius.brr, blr: rootBLR ?? iconRadius.blr,
    }),
  };
  const hoverEffect = animate?.hover && animate.hover.effect;
  const idleEffect = animate?.idle && animate.idle.effect;
  const frameMotion = Boolean(animate?.appearance || hoverEffect === 'transform' || hoverEffect === 'rise' || idleEffect === 'glow');
  const hasFrame = frameMotion || rootClassName !== undefined || Object.values(frameLayout).some(value => value !== undefined);
  const glyphIsVisual = !hasFrame && !sources.hasHover;
  const hasLink = Boolean(href);
  const popupOptions = collapse?.open === false ? undefined : ui?.popup;
  const standalonePopup = resolvePopupOptions(hasLink ? undefined : popupOptions);
  const popup = usePopup(standalonePopup);
  const focusAttrs = {
    id, role, tabIndex,
    'aria-label': label,
    'aria-disabled': ariaDisabled,
    'aria-describedby': describedBy,
  };
  const standaloneFocus = !hasLink ? {
    ...focusAttrs,
    tabIndex: tabIndex ?? (standalonePopup ? 0 : undefined),
    'data-ui-popup-trigger': standalonePopup ? '' : undefined,
    'aria-describedby': [describedBy, popup.describedBy].filter(Boolean).join(' ') || undefined,
  } : undefined;
  // The tooltip preset only uses positioning, containment and focus APIs shared by HTML and SVG.
  const tooltipEvents: ElementEvents<IconVisualNode> = standalonePopup ? {
    onMouseEnter: popup.onMouseEnter,
    onMouseLeave: popup.onMouseLeave,
    onFocus: popup.onFocus,
    onBlur: popup.onBlur,
  } : {};
  const visualStyle = { ...strokeWidths, ...rotation, ...style } as CSSProperties;
  const element = useElement<IconVisualNode>({
    ref: glyphIsVisual ? ref : undefined,
    refs: [standalonePopup ? popup.anchor : undefined],
    motion: { perspective3d, parallax, animate: hasFrame ? animate : undefined },
    style: hasFrame ? undefined : glyphIsVisual ? { ...paint, ...visualStyle } : visualStyle,
    linkState,
    events: [{ handlers: {
      onClick, onMouseEnter, onMouseLeave, onMouseMove, onMouseDown, onMouseUp, onKeyDown, onKeyUp,
      onFocus: hasLink ? undefined : onFocus,
      onBlur: hasLink ? undefined : onBlur,
    } }, { handlers: tooltipEvents }],
  });
  const visualRoot = {
    ...rootProps,
    ...standaloneFocus,
    ...stateProps(state),
    ...element.attributes,
    ...element.events,
    'data-point-events': pointEvents,
    'data-icon-root': 'true',
    style: element.style,
  };
  const iconLayout = boxLayout(classes, {
    ...(!hasFrame && !hasLink ? remainingBox : undefined),
    w, minW, maxW, h, minH, maxH, m, mt, mr, mb, ml, ...iconRadius,
    grow: hasFrame ? undefined : grow,
  });
  const glyph = {
    ...sources.base,
    fill,
    ref: glyphIsVisual ? element.ref : ref,
    hiddenUntilReady: sources.hasHover,
    svgProps: sources.hasHover ? {
      ...elementProps,
      'data-icon-layer': 'default',
      style: paint,
    } : {
      ...elementProps,
      ...(glyphIsVisual ? visualRoot : stateProps(state)),
      'data-point-events': pointEvents,
      'data-icon-root': 'true',
      style: glyphIsVisual ? element.style : { ...paint, ...visualStyle },
      className: cx(...iconLayout, className, glyphIsVisual && element.className),
    },
  };
  const aspectRatio = parseAspectRatio(sources.base.fetched.viewBox || elementProps.viewBox || sources.hover.fetched.viewBox);
  const stack = sources.hasHover ? {
    root: {
      ...(hasFrame ? stateProps(state) : visualRoot),
      'data-point-events': pointEvents,
      'data-icon-root': 'true',
      'data-icon-stack': 'true',
      ref: !hasFrame ? element.ref : undefined,
      style: { aspectRatio, ...(hasFrame ? visualStyle : element.style) },
      className: cx(styles.Stack, ...iconLayout, className, !hasFrame && element.className),
    },
    glyph: {
      ...sources.hover,
      fill,
      hiddenUntilReady: true,
      svgProps: { 'data-icon-layer': 'hover', style: paint, 'aria-hidden': true as const },
    },
  } : undefined;
  const frame = hasFrame ? {
    ...visualRoot,
    ref: element.ref,
    className: cx(
      styles.Frame,
      ...boxLayout(classes, { ...frameLayout, grow }),
      ...classes.value('display', ICON_FRAME_LAYOUT.display),
      ...classes.value('align', ICON_FRAME_LAYOUT.align),
      ...classes.value('justify', ICON_FRAME_LAYOUT.justify),
      rootClassName,
      element.className,
    ),
  } : undefined;
  const link = href ? {
    popup: popupOptions,
    root: {
      ...focusAttrs, href, target, onFocus, onBlur,
      rel: rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined),
      'data-point-events': pointEvents,
      className: cx(styles.Link, ...boxLayout(classes, remainingBox)),
    },
  } : undefined;

  return {
    glyph, stack, frame, link,
    effects: element.effects,
    popup: popup.popup,
    collapse: collapse && { ...collapse, as: 'span' as const, inline: true, axis: collapse.axis ?? 'column' as const },
    hasSource: sources.base.source.kind !== 'empty',
    change: animate?.change,
    identity: sources.identity,
    ready: sources.ready,
  };
}
