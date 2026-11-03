import type React from 'react';
import type { CSSProperties, SVGProps } from 'react';
import {
  boxLayout,
  cx,
  createLayoutClasses,
  resolveRadiusInput,
  shouldUseNextLink,
  splitBoxLayout,
  splitRootDomProps,
  stateProps as buildStateProps,
  type WithRef,
} from '../../core';
import type { FlexProps } from '../Flex';
import { isSharedMotionAnimate } from '../../hooks/useSharedMotion';
import type { IconProps, IconElementProps } from './Icon.types';
import { iconStyles } from './Icon.config';
import styles from './Icon.module.scss';
import { parseAspectRatio } from './svg';
import type { useIconSources } from './useIconSources';
import type { useIconInteractions } from './useIconInteractions';

const c = createLayoutClasses();

export type IconVisualTarget = 'glyph' | 'stack' | 'frame' | 'link';

export interface IconStructure {
  frame: { render: true; interactive: boolean } | null;
  link: { render: true } | null;
  visual: { kind: 'glyph' | 'hover-stack'; interactive: boolean; receivesRootDomProps: boolean; receivesEvents: boolean };
  motionTarget: Exclude<IconVisualTarget, 'link'>;
  tooltipTarget: IconVisualTarget;
}

export interface IconGlyphRecord {
  ref?: React.Ref<SVGSVGElement>;
  source: ReturnType<typeof useIconSources>['base']['source'];
  fetched: ReturnType<typeof useIconSources>['base']['fetched'];
  html: { __html: string };
  fill?: string;
  hiddenUntilReady?: boolean;
  svgProps: SVGProps<SVGSVGElement> & Record<string, unknown>;
}

export type IconVisualRecord =
  | { kind: 'glyph'; glyph: IconGlyphRecord }
  | {
      kind: 'hover-stack';
      ref: React.Ref<HTMLSpanElement>;
      props: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>;
      defaultGlyph: IconGlyphRecord;
      hoverGlyph: IconGlyphRecord;
    };

export interface IconPresentationRecords {
  visual: IconVisualRecord;
  frame: { ref: React.Ref<HTMLDivElement>; props: FlexProps } | null;
  link: {
    kind: 'next' | 'anchor';
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string } & Record<string, unknown>;
  } | null;
}

interface IconPresentationContext {
  props: IconProps & {
    ariaLabel?: string;
    ariaDisabled?: React.AriaAttributes['aria-disabled'];
    dataPointEvents?: string;
  };
  box: ReturnType<typeof splitBoxLayout>['box'];
  rootProps: Record<string, unknown>;
  elementProps: IconElementProps;
  rootStateProps: Record<string, unknown>;
  visualClassName: string;
  iconLayout: ReturnType<typeof boxLayout>;
  rootRadius: ReturnType<typeof resolveRadiusInput>;
  commonStyle: CSSProperties;
  visualStyle: CSSProperties;
  paint: CSSProperties;
  motionStyle?: CSSProperties;
  revealAttrs?: Record<string, string | undefined>;
  visualHandlers?: Record<string, unknown>;
  visualRootProps?: Record<string, unknown>;
  interactiveProps?: Record<string, unknown>;
  describedBy?: string;
  interaction: ReturnType<typeof useIconInteractions>;
  sources: ReturnType<typeof useIconSources>;
  structure: IconStructure;
}

/** Chooses one DOM owner for the visual target, root frame, link, motion, and tooltip. */
export function resolveIconStructure({ hasFrame, hasLink, hasHover }: {
  hasFrame: boolean;
  hasLink: boolean;
  hasHover: boolean;
}): IconStructure {
  const visualTarget: Exclude<IconVisualTarget, 'frame' | 'link'> = hasHover ? 'stack' : 'glyph';

  return {
    frame: hasFrame ? { render: true, interactive: !hasLink } : null,
    link: hasLink ? { render: true } : null,
    visual: {
      kind: hasHover ? 'hover-stack' : 'glyph',
      interactive: !hasFrame && !hasLink,
      receivesRootDomProps: !hasFrame,
      receivesEvents: !hasFrame,
    },
    motionTarget: hasFrame ? 'frame' : visualTarget,
    tooltipTarget: hasLink ? 'link' : hasFrame ? 'frame' : visualTarget,
  };
}

/** Root geometry belongs to a frame when it has its own box styling or shared motion. */
export function needsIconFrame(props: IconProps): boolean {
  const radius = resolveRadiusInput({
    r: props.r,
    tlr: props.tlr,
    trr: props.trr,
    brr: props.brr,
    blr: props.blr,
    borderTLR: props.borderTLR,
    borderTRR: props.borderTRR,
    borderBRR: props.borderBRR,
    borderBLR: props.borderBLR,
  });
  const rootRadius = resolveRadiusInput({
    r: props.rootR ?? radius.r,
    tlr: props.rootTLR ?? radius.tlr,
    trr: props.rootTRR ?? radius.trr,
    brr: props.rootBRR ?? radius.brr,
    blr: props.rootBLR ?? radius.blr,
  });
  const rootSize = [props.rootW, props.rootMinW, props.rootMaxW, props.rootH, props.rootMinH, props.rootMaxH];
  const rootBorder = [props.border, props.borderC, props.borderS, props.borderW, props.borderT, props.borderR, props.borderB, props.borderL];
  const rootCorners = [rootRadius.r, rootRadius.tlr, rootRadius.trr, rootRadius.brr, rootRadius.blr];

  return [...rootSize, ...rootBorder, ...rootCorners, props.rootBg, props.rootClassName].some((value) => value !== undefined)
    || isSharedMotionAnimate(props.animate);
}

interface IconDomParts {
  box: ReturnType<typeof splitBoxLayout>['box'];
  rootProps: Record<string, unknown>;
  elementProps: IconElementProps;
}

/** Removes Icon-owned settings before routing the remaining attributes to their DOM target. */
function splitIconDomProps(props: WithRef<IconProps, SVGSVGElement>): IconDomParts {
  const {
    ref: _ref,
    src: _src,
    name: _name,
    hover: _hover,
    component: _component,
    href,
    target,
    rel,
    id,
    className = '',
    style,
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
    tooltipDirection: _tooltipDirection,
    tooltipGap: _tooltipGap,
    linkState: _linkState,
    onClick: _onClick,
    onMouseEnter: _onMouseEnter,
    onMouseLeave: _onMouseLeave,
    onMouseMove: _onMouseMove,
    onMouseDown: _onMouseDown,
    onMouseUp: _onMouseUp,
    onFocus: _onFocus,
    onBlur: _onBlur,
    onKeyDown: _onKeyDown,
    onKeyUp: _onKeyUp,
    perspective3d: _perspective3d,
    parallax: _parallax,
    animate: _animate,
    collapse: _collapse,
    'aria-label': _ariaLabel,
    'aria-describedby': _ariaDescribedBy,
    'aria-disabled': _ariaDisabled,
    'data-point-events': _dataPointEvents,
    ...rest
  } = props;

  const { box, rest: elementAttributes } = splitBoxLayout(rest);
  const { rootProps: rawRootProps, elementProps: rawElementProps } = splitRootDomProps(elementAttributes as IconElementProps);
  return { box, rootProps: rawRootProps as Record<string, unknown>, elementProps: rawElementProps };
}

/** Resolves geometry, DOM props, and owner-selected handlers once for all render records. */
function createPresentationContext(
  props: WithRef<IconProps, SVGSVGElement>,
  sources: ReturnType<typeof useIconSources>,
  interaction: ReturnType<typeof useIconInteractions>,
  structure: IconStructure,
): IconPresentationContext {
  const { box, rootProps, elementProps } = splitIconDomProps(props);
  const {
    href, id, className = '', style, role, tabIndex,
    w, minW, maxW, h, minH, maxH, rotate, m, mt, mr, mb, ml, grow,
    r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR,
    color, fill, stroke, strokeWidth,
    state, rootR, rootTLR, rootTRR, rootBRR, rootBLR,
    'aria-label': ariaLabel,
    'aria-disabled': ariaDisabled,
    'data-point-events': dataPointEvents,
  } = props;

  const describedBy = interaction.tooltip.describedBy;
  const rootStateProps = buildStateProps(state);
  const { rotation, strokeWidths, paint } = iconStyles.resolve({ rotate, strokeWidth, color, fill, stroke });
  const commonStyle = { ...(strokeWidths as CSSProperties), ...(rotation as CSSProperties), ...style };
  const iconSize = { w, minW, maxW, h, minH, maxH };
  const iconRadius = resolveRadiusInput({ r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR });
  const rootRadius = resolveRadiusInput({
    r: rootR ?? iconRadius.r,
    tlr: rootTLR ?? iconRadius.tlr,
    trr: rootTRR ?? iconRadius.trr,
    brr: rootBRR ?? iconRadius.brr,
    blr: rootBLR ?? iconRadius.blr,
  });
  const iconLayout = boxLayout(c, {
    ...(!structure.frame && !href ? box : {}),
    m, mt, mr, mb, ml,
    ...iconRadius,
    ...iconSize,
    grow: structure.frame ? undefined : grow,
  });
  const visualClassName = cx(styles.Icon, 'ui-icon', ...iconLayout, className);
  const visualHandlers = structure.visual.receivesEvents ? interaction.visual.handlers : undefined;
  const visualRootProps = structure.visual.receivesRootDomProps ? rootProps : undefined;
  const interactiveProps = structure.visual.interactive ? {
    id, role, tabIndex, 'aria-label': ariaLabel, 'aria-describedby': describedBy, 'aria-disabled': ariaDisabled,
  } : undefined;
  const motionStyle = structure.motionTarget === 'frame' ? undefined : interaction.motion.motionStyle;
  const revealAttrs = structure.motionTarget === 'frame' ? undefined : interaction.motion.revealAttrs;
  const visualStyle = { ...paint, ...commonStyle, ...(motionStyle ?? null) };

  return {
    props: { ...props, ariaLabel, ariaDisabled, dataPointEvents },
    box,
    rootProps,
    elementProps,
    rootStateProps,
    visualClassName,
    iconLayout,
    rootRadius,
    commonStyle,
    visualStyle,
    paint,
    motionStyle,
    revealAttrs,
    visualHandlers,
    visualRootProps,
    interactiveProps,
    describedBy,
    interaction,
    sources,
    structure,
  };
}

function createDefaultGlyph(context: IconPresentationContext): IconGlyphRecord {
  const { interaction, sources, structure, props } = context;
  return {
    ref: interaction.refs.glyph,
    source: sources.base.source,
    fetched: sources.base.fetched,
    html: sources.base.html,
    fill: props.fill,
    hiddenUntilReady: structure.visual.kind === 'hover-stack',
    svgProps: {
      ...(context.interactiveProps ?? null),
      ...(context.visualRootProps ?? null),
      'data-point-events': props.dataPointEvents,
      'data-icon-root': 'true',
      ...(context.revealAttrs ?? null),
      className: context.visualClassName,
      style: context.visualStyle,
      ...context.rootStateProps,
      ...context.visualHandlers,
      ...context.elementProps,
    },
  };
}

function createVisualRecord(context: IconPresentationContext, defaultGlyph: IconGlyphRecord): IconVisualRecord {
  const { interaction, sources, structure, props } = context;
  if (structure.visual.kind === 'glyph') return { kind: 'glyph', glyph: defaultGlyph };

  const viewBox = sources.base.fetched.viewBox || context.elementProps.viewBox || sources.hover.fetched.viewBox;
  const aspectRatio = parseAspectRatio(viewBox);
  return {
    kind: 'hover-stack',
    ref: interaction.refs.stack,
    props: {
      ...(context.interactiveProps ?? null),
      ...(context.visualRootProps ?? null),
      'data-point-events': props.dataPointEvents,
      ...context.rootStateProps,
      className: cx(styles.Icon, 'ui-icon-wrapper', ...context.iconLayout, props.className),
      style: { ...(aspectRatio ? { aspectRatio } : null), ...context.commonStyle, ...(context.motionStyle ?? null) },
      ...context.visualHandlers,
      ...(context.revealAttrs ?? null),
      'data-icon-root': 'true',
      'data-icon-stack': 'true',
    } as React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>,
    defaultGlyph: {
      ...defaultGlyph,
      svgProps: { 'data-icon-layer': 'default', ...(context.revealAttrs ?? null), className: 'ui-icon', style: context.paint, ...context.elementProps },
    },
    hoverGlyph: {
      source: sources.hover.source,
      fetched: sources.hover.fetched,
      html: sources.hover.html,
      fill: props.fill,
      hiddenUntilReady: true,
      svgProps: { 'data-icon-layer': 'hover', className: 'ui-icon', style: context.paint, 'aria-hidden': true },
    },
  };
}

function createLinkRecord(context: IconPresentationContext): IconPresentationRecords['link'] {
  const { href, target, rel, id, role, tabIndex, ariaLabel, ariaDisabled, dataPointEvents } = context.props;
  if (!href) return null;

  return {
    kind: shouldUseNextLink(href, target) ? 'next' : 'anchor',
    props: {
      href,
      target,
      rel: rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined),
      className: cx(
          'ui-icon-link',
          ...boxLayout(c, context.box),
          context.interaction.tooltip.has && 'ui-icon-tooltip-anchor',
      ),
      id,
      role,
      tabIndex,
      'aria-label': ariaLabel,
      'aria-disabled': ariaDisabled,
      'data-point-events': dataPointEvents,
      'aria-describedby': context.describedBy,
      ref: context.interaction.link?.ref,
      ...context.interaction.link?.handlers,
    },
  };
}

function createFrameRecord(context: IconPresentationContext): IconPresentationRecords['frame'] {
  const { structure, interaction } = context;
  if (!structure.frame) return null;

  const {
    id, role, tabIndex, ariaLabel, ariaDisabled, dataPointEvents, rootClassName, rootBg,
    rootW, rootMinW, rootMaxW, rootH, rootMinH, rootMaxH, border, borderC, borderS,
    borderW, borderT, borderR, borderB, borderL, grow, state,
  } = context.props;
  return {
    ref: interaction.refs.frame,
    props: {
      ...(structure.frame.interactive ? { id, role, tabIndex, 'aria-label': ariaLabel, 'aria-describedby': context.describedBy, 'aria-disabled': ariaDisabled } : null),
      ...context.rootProps,
      'data-point-events': dataPointEvents,
      'data-icon-root': 'true',
      className: cx(
          styles.Icon,
          'ui-icon-root',
          interaction.tooltip.has && 'ui-icon-tooltip-anchor',
          rootClassName,
          ...c.value('bg', rootBg),
      ),
      w: rootW, minW: rootMinW, maxW: rootMaxW, h: rootH, minH: rootMinH, maxH: rootMaxH,
      ...context.rootRadius,
      border, borderC, borderS, borderW, borderT, borderR, borderB, borderL,
      grow,
      state,
      align: ['center', 'center', 'center'],
      justify: ['center', 'center', 'center'],
      ...interaction.motion.revealAttrs,
      style: interaction.motion.motionStyle,
      ...interaction.visual.handlers,
    } as FlexProps,
  };
}

/** Purely maps public Icon props and selected owners to concrete root/link/glyph render records. */
export function resolveIconPresentation(
  props: WithRef<IconProps, SVGSVGElement>,
  sources: ReturnType<typeof useIconSources>,
  interaction: ReturnType<typeof useIconInteractions>,
  structure: IconStructure,
): IconPresentationRecords {
  const context = createPresentationContext(props, sources, interaction, structure);
  const defaultGlyph = createDefaultGlyph(context);

  return {
    visual: createVisualRecord(context, defaultGlyph),
    frame: createFrameRecord(context),
    link: createLinkRecord(context),
  };
}
