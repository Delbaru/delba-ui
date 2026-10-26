'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useId, type CSSProperties } from 'react';
import type React from 'react';

import styles from './Button.module.scss';

import { boxLayout, composeEventHandlers, createLayoutClasses, cx, resolveLinkProps, shouldUseNextLink, splitBoxLayout, stateLinkProps, stateProps, useMergedRefs, type BoxLayoutProps, type ComponentStateValue, type ResponsiveValue, type StateLinkInput, type WithRef } from '../../core';
import { useTooltip } from '../../hooks/useTooltip';
import { useAnimationVisibility } from '../../hooks/useAnimationVisibility';
import type { AppearanceAnimate } from '../../core/reveal/reveal';
import type { HoverTransformAnimate } from '../../core/base/hover-motion';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { CollapseWrap, type CollapseOptions } from '../Collapse/CollapseWrap';
import { buttonHoverProps, type ButtonHoverAnimate } from './hover/buttonHover';
import { buttonIdleProps, type ButtonIdleAnimate } from './idle/buttonIdle';

export type ButtonVariant = 'primary' | 'secondary' | 'secondaryFill' | 'tertiary';
export type ButtonSize = 'small' | 'medium' | 'large';

type AlignItemsKey = 'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline';
type JustifyContentKey = 'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly';

const c = createLayoutClasses(styles);

/** Появление сочетается с независимыми эффектами наведения и покоя. Legacy when остаётся поддержан. */
export type ButtonAnimate = HoverTransformAnimate | ButtonHoverAnimate | ButtonIdleAnimate | (AppearanceAnimate & {
  /** Наведение поверх появления; false явно отключает эффект роли. */
  hover?: Omit<ButtonHoverAnimate, 'when'> | false;
  /** Эффект в покое поверх появления. */
  idle?: Omit<ButtonIdleAnimate, 'when'>;
});

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'href' | 'target' | 'rel'>,
    Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>,
    Omit<BoxLayoutProps, 'aspectRatio'>,
    Omit<SharedMotionProps, 'animate'> {
  /** Появление, hover/idle или их совместная настройка. */
  animate?: ButtonAnimate;
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Сворачивает кнопку целиком; для ширины укажите `axis: 'column'`. */
  collapse?: CollapseOptions;

  newTab?: boolean;
  nofollow?: boolean;
  noreferrer?: boolean;

  variant?: ResponsiveValue<ButtonVariant>;
  size?: ResponsiveValue<ButtonSize>;

  justifyContent?: ResponsiveValue<JustifyContentKey>;
  alignItems?: ResponsiveValue<AlignItemsKey>;

  gap?: ResponsiveValue<number>;
  color?: string;
  state?: ComponentStateValue;

  linkState?: StateLinkInput;

  /** Подсказка при наведении или фокусе; изменение текста сохраняет DOM-узел кнопки. */
  tooltip?: React.ReactNode;
  /** Tooltip position relative to the button: right, left, top, bottom. Default: right */
  tooltipDirection?: 'right' | 'left' | 'top' | 'bottom';
  /** Gap between button and tooltip in px. Default: 8 */
  tooltipGap?: number;
}

export function Button({
  ref,
  children,
  className = '',
  style,
  collapse,
  variant,
  size,
  justifyContent,
  alignItems,
  gap,
  perspective3d,
  parallax,
  animate,
  color,
  state,
  disabled = false,
  type,
  href,
  target,
  rel,
  download,
  newTab,
  nofollow,
  noreferrer,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onClick,
  onFocus,
  onBlur,
  linkState,
  tooltip,
  tooltipDirection = 'right',
  tooltipGap = 8,
  'aria-describedby': ariaDescribedBy,
  ...props
}: WithRef<ButtonProps, HTMLElement>) {
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const isLink = Boolean(href);
  const useNextLink = isLink && shouldUseNextLink(href, target, download);
  const Comp = (useNextLink ? Link : isLink ? 'a' : 'button') as React.ElementType;
  const linkProps = resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer });
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });
  const hover = buttonHoverProps(animate);
  const idle = buttonIdleProps(animate);
  const setIdleNode = useAnimationVisibility(idle['data-button-idle'] === 'glow' && !disabled);
  const tooltipId = useId();
  const hasTooltip = Boolean(tooltip);
  const describedBy = [ariaDescribedBy, hasTooltip ? tooltipId : undefined].filter(Boolean).join(' ') || undefined;
  const { anchorRef, tooltipRef, anchorHandlers, bubbleProps } = useTooltip({
    enabled: hasTooltip,
    direction: tooltipDirection,
    gap: tooltipGap,
  });
  const setBehaviorRefs = useMergedRefs(anchorRef, setMotionNode, setIdleNode);
  const setRefs = useMergedRefs(setBehaviorRefs, ref);

  // Native anchors can be disabled without changing their host node by removing href. Next Link
  // requires a valid href prop, so that branch keeps its source href and blocks activation below.
  const anchorProps = isLink
    ? {
        ...rest,
        ...linkProps,
        ...(!useNextLink && disabled ? { href: undefined } : null),
        tabIndex: disabled ? -1 : rest.tabIndex,
        'aria-disabled': disabled ? true : rest['aria-disabled'],
      }
    : { ...rest, type: type ?? 'button', disabled };

  const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
  };

  const button = (
    <Comp
      ref={setRefs}
      className={cx(
        'ui-button',
        ...c.value('variant', variant),
        ...c.value('size', size),
        ...c.value('justify', justifyContent),
        ...c.value('align', alignItems),
        ...c.value('gap', gap),
        ...layout,
        ...c.value('color', color),
        className
      )}
      style={{
        ...(motionStyle ?? null),
        ...hover.style,
        ...idle.style,
        ...style,
      }}
      {...stateProps(state, disabled && 'disabled')}
      {...anchorProps}
      {...revealAttrs}
      data-button-hover={hover['data-button-hover']}
      data-button-idle={idle['data-button-idle']}
      aria-describedby={describedBy}
      {...stateLinkProps(disabled ? undefined : linkState, {
        onMouseEnter: composeEventHandlers(composeEventHandlers(anchorHandlers.onMouseEnter, motionHandlers?.onMouseEnter), onMouseEnter),
        onMouseMove: composeEventHandlers(motionHandlers?.onMouseMove, onMouseMove),
        onMouseLeave: composeEventHandlers(composeEventHandlers(anchorHandlers.onMouseLeave, motionHandlers?.onMouseLeave), onMouseLeave),
        onMouseDown,
        onMouseUp,
        onClick: handleClick,
        onFocus: composeEventHandlers(anchorHandlers.onFocus, onFocus),
        onBlur: composeEventHandlers(anchorHandlers.onBlur, onBlur),
      })}
    >
      {idle['data-button-idle'] === 'glow' && (
        <>
          <span aria-hidden="true" className="ui-button-glow" />
          <span aria-hidden="true" className="ui-button-glow-surface" />
        </>
      )}
      {children}
    </Comp>
  );

  const tooltipNode = hasTooltip && bubbleProps.portalNode ? createPortal(
    <span
        ref={tooltipRef}
        id={tooltipId}
        className={'ui-button-tooltip'}
        style={bubbleProps.style}
        role='tooltip'
        aria-hidden={!bubbleProps.active}
        data-placement={bubbleProps.placement}
        {...stateProps(bubbleProps.active && 'active')}
    >
      {tooltip}
    </span>,
    bubbleProps.portalNode
  ) : null;

  // Постоянная позиция кнопки в дереве сохраняет DOM и фокус при смене tooltip.
  const result = <>{button}{tooltipNode}</>;

  if (!collapse) return result;
  return <CollapseWrap {...collapse} as="span" inline>{result}</CollapseWrap>;
}
