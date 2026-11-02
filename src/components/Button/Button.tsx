'use client';

import Link from 'next/link';
import { useLinkPrefetch } from '../../hooks/useLinkPrefetch';
import { useId } from 'react';
import type React from 'react';

import styles from './Button.module.scss';

import { boxLayout, composeEventHandlers, composeInteractionHandlers, createLayoutClasses, cx, resolveLinkProps, shouldUseNextLink, splitBoxLayout, stateLinkProps, stateProps, useMergedRefs, type WithRef } from '../../core';
import { useTooltip } from '../../hooks/useTooltip';
import { useAnimationVisibility } from '../../hooks/useAnimationVisibility';
import { useSharedMotion } from '../../hooks/useSharedMotion';
import { CollapseWrap } from '../Collapse/CollapseWrap';
import { buttonHoverProps } from './hover/buttonHover';
import { buttonIdleProps } from './idle/buttonIdle';

export type { ButtonVariant, ButtonSize, ButtonAnimate, ButtonProps } from './Button.types';
import type { ButtonProps } from './Button.types';
import { ButtonTooltip } from './ButtonTooltip/ButtonTooltip';

const c = createLayoutClasses(styles);

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
  prefetch,
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
  const prepare = useLinkPrefetch(prefetch, href, useNextLink && !newTab && !disabled);
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
        ...(useNextLink ? { prefetch: prepare.prefetch } : null),
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

  const interactions = composeInteractionHandlers(
    composeInteractionHandlers(anchorHandlers, motionHandlers ?? {}),
    { onMouseEnter, onMouseMove, onMouseLeave, onMouseDown, onMouseUp, onClick: handleClick, onFocus, onBlur },
  );
  const interactionHandlers = stateLinkProps(disabled ? undefined : linkState, {
    ...interactions,
    onMouseEnter: composeEventHandlers(interactions.onMouseEnter, prepare.onIntent),
    onFocus: composeEventHandlers(interactions.onFocus, prepare.onIntent),
  });

  const button = (
    <Comp
      ref={setRefs}
      className={cx(
        'Button', styles.Button, 'ui-button',
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
      {...interactionHandlers}
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

  const tooltipNode = hasTooltip ? (
    <ButtonTooltip ref={tooltipRef} id={tooltipId} bubble={bubbleProps}>{tooltip}</ButtonTooltip>
  ) : null;

  // Постоянная позиция кнопки в дереве сохраняет DOM и фокус при смене tooltip.
  const result = <>{button}{tooltipNode}</>;

  if (!collapse) return result;
  return <CollapseWrap {...collapse} as="span" inline>{result}</CollapseWrap>;
}
