'use client';

import Link from 'next/link';
import { useLinkPrefetch } from '../../hooks/useLinkPrefetch';
import { isValidElement, useId } from 'react';
import type React from 'react';

import styles from './Button.module.scss';

import { boxLayout, composeEventHandlers, composeInteractionHandlers, createLayoutClasses, cx, resolveLinkProps, shouldUseNextLink, splitBoxLayout, stateLinkProps, stateProps, useMergedRefs, type WithRef } from '../../core';
import { useTooltip } from '../../hooks/useTooltip';
import { useActionInvocation } from '../../hooks/useActionInvocation';
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
  onActionSettled,
  actionName,
  'aria-busy': ariaBusy,
  'aria-describedby': ariaDescribedBy,
  ...props
}: WithRef<ButtonProps, HTMLElement>) {
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, box);
  const { pending, invoke } = useActionInvocation({ action: onClick, onSettled: onActionSettled, actionName });
  const effectiveDisabled = disabled || pending;
  const isLink = Boolean(href);
  const useNextLink = isLink && shouldUseNextLink(href, target, download);
  const prepare = useLinkPrefetch(prefetch, href, useNextLink && !newTab && !effectiveDisabled);
  const Comp = (useNextLink ? Link : isLink ? 'a' : 'button') as React.ElementType;
  const linkProps = resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer });
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate });
  const hover = buttonHoverProps(animate);
  const idle = buttonIdleProps(animate);
  const setIdleNode = useAnimationVisibility(idle['data-button-idle'] === 'glow' && !effectiveDisabled);
  const tooltipId = useId();
  const isConfig = Boolean(tooltip && typeof tooltip === 'object' && !isValidElement(tooltip) && 'label' in tooltip);
  const tooltipConfig = isConfig ? tooltip as { label: React.ReactNode; direction?: 'top' | 'bottom' | 'left' | 'right'; gap?: number } : null;
  const tooltipLabel: React.ReactNode = tooltipConfig ? tooltipConfig.label : tooltip as React.ReactNode;
  const hasTooltip = tooltipLabel !== null && tooltipLabel !== undefined && tooltipLabel !== false && tooltipLabel !== '';
  const { anchorRef, tooltipRef, anchorHandlers, bubbleProps, isActive } = useTooltip({
    enabled: hasTooltip && !effectiveDisabled,
    direction: tooltipConfig?.direction ?? tooltipDirection,
    gap: tooltipConfig?.gap ?? tooltipGap,
    hoverDelayMs: 400,
    resetKey: tooltipLabel,
  });
  const describedBy = [ariaDescribedBy, isActive ? tooltipId : undefined].filter(Boolean).join(' ') || undefined;
  const setBehaviorRefs = useMergedRefs(anchorRef, setMotionNode, setIdleNode);
  const setRefs = useMergedRefs(setBehaviorRefs, ref);

  // Native anchors can be disabled without changing their host node by removing href. Next Link
  // requires a valid href prop, so that branch keeps its source href and blocks activation below.
  const anchorProps = isLink
    ? {
        ...rest,
        ...linkProps,
        ...(useNextLink ? { prefetch: prepare.prefetch } : null),
        ...(!useNextLink && effectiveDisabled ? { href: undefined } : null),
        tabIndex: effectiveDisabled ? -1 : rest.tabIndex,
        'aria-disabled': effectiveDisabled ? true : rest['aria-disabled'],
      }
    : { ...rest, type: type ?? 'button', disabled: effectiveDisabled };

  const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
    if (effectiveDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Invokes the user callback once. Never prevents native submit/link navigation.
    invoke(event as React.MouseEvent<HTMLButtonElement>);
  };

  const interactions = composeInteractionHandlers(
    composeInteractionHandlers(anchorHandlers, motionHandlers ?? {}),
    { onMouseEnter, onMouseMove, onMouseLeave, onMouseDown, onMouseUp, onClick: handleClick, onFocus, onBlur },
  );
  const interactionHandlers = stateLinkProps(effectiveDisabled ? undefined : linkState, {
    ...interactions,
    onMouseEnter: composeEventHandlers(interactions.onMouseEnter, prepare.onIntent),
    onFocus: composeEventHandlers(interactions.onFocus, prepare.onIntent),
  });

  const button = (
    <Comp
      ref={setRefs}
      className={cx(
          styles.Button,
          'ui-button',
          ...c.value('variant', variant),
          ...c.value('size', size),
          ...c.value('justify', justifyContent),
          ...c.value('align', alignItems),
          ...c.value('gap', gap),
          ...layout,
          ...c.value('color', color),
          className,
      )}
      style={{
        ...(motionStyle ?? null),
        ...hover.style,
        ...idle.style,
        ...style,
      }}
      {...stateProps(state, effectiveDisabled && 'disabled', pending && 'loading')}
      {...anchorProps}
      aria-busy={ariaBusy ?? (pending || undefined)}
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
    <ButtonTooltip ref={tooltipRef} id={tooltipId} bubble={bubbleProps}>{tooltipLabel}</ButtonTooltip>
  ) : null;

  // Постоянная позиция кнопки в дереве сохраняет DOM и фокус при смене tooltip.
  const result = <>{button}{tooltipNode}</>;

  if (!collapse) return result;
  return <CollapseWrap {...collapse} as="span" inline>{result}</CollapseWrap>;
}
