'use client';

import Link from 'next/link';
import { useLinkPrefetch } from '../../hooks/useLinkPrefetch';
import { isValidElement, useId } from 'react';
import type React from 'react';

import styles from './Button.module.scss';

import { boxLayout, composeEventHandlers, composeInteractionHandlers, createLayoutClasses, cx, resolveLinkProps, shouldUseNextLink, splitBoxLayout, stateLinkProps, stateProps, useMergedRefs, type WithRef } from '../../core';
import { usePopup } from '../../core/Popup/Popup';
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
  onKeyDown,
  onContextMenu,
  ui,
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
  const action = ui?.action;
  const local = useActionInvocation({
    action: action?.controller ? undefined : action?.run ?? onClick,
    onSettled: onActionSettled,
    actionName,
    identity: action?.run ? action.identity : undefined,
    admissionKey: action?.run ? action.admissionKey : undefined,
    onSuccess: action?.run ? action.onSuccess : undefined,
    onCancel: action?.run ? action.onCancel : undefined,
  });
  const pending = action?.controller?.pending ?? local.pending;
  const effectiveDisabled = disabled || pending || !!action?.disabled;
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
  const popupTooltip = ui?.popup?.preset === 'tooltip' ? ui.popup : undefined;
  const menuOptions = collapse?.open !== false && !effectiveDisabled && ui?.popup && ui.popup.preset !== 'tooltip' ? ui.popup : undefined;
  const popup = usePopup(menuOptions);
  const resolvedTooltip = popupTooltip ? { label: popupTooltip.text, direction: popupTooltip.position ?? 'top' } : tooltip;
  const isConfig = Boolean(resolvedTooltip && typeof resolvedTooltip === 'object' && !isValidElement(resolvedTooltip) && 'label' in resolvedTooltip);
  const tooltipConfig = isConfig ? resolvedTooltip as { label: React.ReactNode; direction?: 'top' | 'bottom' | 'left' | 'right'; gap?: number } : null;
  const tooltipLabel: React.ReactNode = tooltipConfig ? tooltipConfig.label : resolvedTooltip as React.ReactNode;
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
  const setPopupRefs = useMergedRefs(setBehaviorRefs, popup.anchor);
  const setRefs = useMergedRefs(setPopupRefs, ref);

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
    if (action?.controller) {
      event.preventDefault();
      void action.controller.invoke();
    } else {
      if (action?.run) event.preventDefault();
      void local.invoke(event as React.MouseEvent<HTMLButtonElement>);
    }
  };

  const interactions = composeInteractionHandlers(
    composeInteractionHandlers(anchorHandlers, motionHandlers ?? {}),
    { onMouseEnter, onMouseMove, onMouseLeave, onMouseDown, onMouseUp, onClick: handleClick, onFocus, onBlur },
  );
  const interactionHandlers = stateLinkProps(effectiveDisabled ? undefined : linkState, {
    ...interactions,
    onMouseEnter: composeEventHandlers(composeEventHandlers(interactions.onMouseEnter, prepare.onIntent), menuOptions ? popup.onMouseEnter : undefined),
    onMouseLeave: composeEventHandlers(interactions.onMouseLeave, menuOptions ? popup.onMouseLeave : undefined),
    onClick: composeEventHandlers(interactions.onClick, menuOptions ? popup.onClick : undefined, { cancelable: true }),
    onFocus: composeEventHandlers(composeEventHandlers(interactions.onFocus, prepare.onIntent), menuOptions ? popup.onFocus : undefined),
    onBlur: composeEventHandlers(interactions.onBlur, menuOptions ? popup.onBlur : undefined),
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
      data-ui-popup-trigger={menuOptions ? '' : undefined}
      aria-controls={rest['aria-controls'] ?? popup.controls}
      aria-haspopup={rest['aria-haspopup'] ?? (menuOptions ? 'menu' : undefined)}
      aria-expanded={rest['aria-expanded'] ?? (menuOptions ? popup.open : undefined)}
      onKeyDown={composeEventHandlers(onKeyDown, menuOptions ? popup.onKeyDown : undefined, { cancelable: true })}
      onContextMenu={composeEventHandlers(onContextMenu, menuOptions ? popup.onContextMenu : undefined, { cancelable: true })}
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
  const result = <>{button}{tooltipNode}{popup.popup}</>;

  if (!collapse) return result;
  return <CollapseWrap {...collapse} as="span" inline>{result}</CollapseWrap>;
}
