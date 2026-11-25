'use client';

import Link from 'next/link';

import styles from './Flex.module.scss';
import { useLinkPrefetch } from '../../hooks/useLinkPrefetch';
import { useRef } from 'react';
import type React from 'react';
import {
  boxLayout,
  composeEventHandlers,
  containerClass,
  createLayoutClasses,
  cx,
  resolveLinkProps,
  shouldUseNextLink,
  splitBoxLayout,
  stateLinkProps,
  stateProps,
  useMergedRefs,
  type WithRef,
} from '../../core';
import { isSharedMotionAnimate, useSharedMotion } from '../../hooks/useSharedMotion';
import { resolveContentAnimate } from '../../hooks/contentMotion';
import { useContentMotion } from '../../hooks/useContentMotion';
import { CollapseWrap, type CollapseOptions, type CollapseWrapProps } from '../Collapse/CollapseWrap';
import { InteractionScope } from '../../core/InteractionScope';
import { FormContext } from '../../core/Form';
import { usePopup } from '../../core/Popup/Popup';
import { useAsyncContent } from '../../core/Async/Async';
import { useScrollSurface } from '../../core/Scroll/Surface';
import { CollectionContext } from '../../core/Collection/Collection';

import type { FlexProps } from './Flex.types';
export type { FlexProps } from './Flex.types';

const c = createLayoutClasses();

export function Flex({
  ref,
  as = 'div',
  children,
  ui,
  onSubmit,
  onKeyDown,
  onContextMenu,
  className = '',
  style,
  gap,
  rowGap,
  columnGap,
  collapse,
  collapseGap,
  onCollapseEnd,
  collapseFade,
  collapseOverflowVisible,
  collapseAxis,
  collapseAppear,
  collapseKeepMounted,
  onCollapseFound,
  collapseRef,
  onTransition,
  animate,
  dir,
  justify,
  align,
  wrap,
  scrollFade,
  perspective3d,
  parallax,
  container,
  state,
  trackInteraction,
  motionScope,
  onInteractionChange,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onClick,
  onFocus,
  onBlur,
  href,
  target,
  rel,
  download,
  newTab,
  nofollow,
  noreferrer,
  prefetch,
  linkState,
  ...props
}: WithRef<FlexProps, HTMLElement>) {
  const scroll = useScrollSurface(ui?.scroll);
  const collapseInput = ui?.collapse?.settings ?? collapse;
  const collapsed = collapseInput === false ||
    (typeof collapseInput === 'object' && collapseInput.open === false);
  const popupOptions = collapsed ? undefined : ui?.popup;
  const popup = usePopup(popupOptions);
  const asyncContent = useAsyncContent(ui?.async, children);
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, { ...scroll?.layout, ...box });
  const fade = scroll?.fade ?? scrollFade;
  const isLink = Boolean(href);
  const useNextLink = isLink && shouldUseNextLink(href, target, download);
  const prepare = useLinkPrefetch(prefetch, href, useNextLink && !newTab);
  const Comp = (isLink ? (useNextLink ? Link : 'a') : as) as React.ElementType;
  const resolved = resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer });
  const anchorProps = isLink
    ? { ...rest, ...resolved, ...(useNextLink ? { prefetch: prepare.prefetch } : null) }
    : rest;
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({
    perspective3d,
    parallax,
      animate,
  });
  const contentAnimate = isSharedMotionAnimate(animate) ? undefined : animate;
  const contentMotion = useContentMotion({
    ...resolveContentAnimate(contentAnimate),
    children: asyncContent.children,
    onAnimationEnd: anchorProps.onAnimationEnd,
  });
  const interactionRef = useRef<HTMLElement>(null);
  const surfaceRef = useMergedRefs(ref, interactionRef, popup.anchor);
  const setRefs = useMergedRefs(setMotionNode, contentMotion.ref, surfaceRef);

  const selectable = ui?.selectable;
  const form = ui?.form;
  const nestedEnter = form && (as !== 'form' || isLink) ? (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.key !== 'Enter' || event.nativeEvent.isComposing || event.repeat ||
        event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (!target.matches?.('input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"])') ||
        target.closest('[data-ui-form-scope]') !== event.currentTarget || !target.closest('form')) return;
    event.preventDefault(); event.stopPropagation();
    if (!form.disabled && form.ready) void form.submit();
  } : undefined;
  let scopedChildren = contentMotion.children;
  if (ui?.form) scopedChildren = <FormContext form={ui.form}>{scopedChildren}</FormContext>;
  if (ui?.collection) scopedChildren = <CollectionContext collection={ui.collection}>{scopedChildren}</CollectionContext>;
  const collapseOptions: CollapseOptions | undefined =
    typeof collapseInput === 'boolean' ? { open: collapseInput } : collapseInput;

  // A minimum height requires clipping on the inner layer rather than Flex itself.
  return (
    <FlexFrame
      target={interactionRef}
      track={Boolean(trackInteraction || onInteractionChange)}
      onChange={onInteractionChange}
      hasPopup={Boolean(popupOptions)}
      popup={popup.popup}
      collapse={collapseOptions && {
        open: collapseOptions.open,
        defaultOpen: collapseOptions.defaultOpen,
        onOpenChange: collapseOptions.onOpenChange,
        clip: box.minH != null,
        axis: collapseOptions.axis ?? collapseAxis,
        gap: collapseOptions.gap ?? collapseGap,
        gapSide: collapseOptions.gapSide,
        fade: collapseOptions.fade ?? collapseFade,
        overflowVisibleWhenOpen: collapseOptions.overflowVisibleWhenOpen ?? collapseOverflowVisible,
        appear: collapseOptions.appear ?? collapseAppear,
        keepMounted: collapseOptions.keepMounted ?? collapseKeepMounted,
        onFound: collapseOptions.onFound ?? onCollapseFound,
        onEnd: collapseOptions.onEnd ?? onCollapseEnd,
        onTransition: collapseOptions.onTransition ?? onTransition,
        handleRef: collapseOptions.ref ?? collapseRef,
      }}
    >
      {active => (
        <Comp
          ref={setRefs}
          className={cx(
              styles.Flex,
              'ui-flex',
              containerClass(container),
              ...layout,
              ...c.value('gap', gap),
              ...c.value('rowGap', rowGap),
              ...c.value('columnGap', columnGap),
              ...c.value('dir', dir),
              ...c.value('justify', justify),
              ...c.value('align', align),
              ...c.value('wrap', wrap),
              fade && (fade === 'x' ? 'scrollFadeX' : 'scrollFadeY'),
              scroll?.className,
              contentMotion.className,
              className,
          )}
          style={{
            ...(motionStyle ?? null),
            ...scroll?.style,
            ...style,
            ...(contentMotion.style ?? null),
          }}
          {...revealAttrs}
          data-motion-scope={motionScope ? '' : undefined}
          {...stateProps(state, trackInteraction && active && 'interacting')}
          {...anchorProps}
          data-scroll-axis={scroll?.axis ?? (anchorProps as { 'data-scroll-axis'?: string })['data-scroll-axis']}
          tabIndex={anchorProps.tabIndex ?? (selectable || popupOptions ? 0 : undefined)}
          aria-busy={anchorProps['aria-busy'] ?? asyncContent.busy}
          data-ui-popup-trigger={popupOptions ? '' : undefined}
          aria-describedby={[anchorProps['aria-describedby'], popup.describedBy].filter(Boolean).join(' ') || undefined}
          aria-controls={anchorProps['aria-controls'] ?? popup.controls}
          aria-haspopup={anchorProps['aria-haspopup'] ?? (popupOptions && popupOptions.preset !== 'tooltip' ? 'menu' : undefined)}
          aria-expanded={anchorProps['aria-expanded'] ?? (popupOptions && popupOptions.preset !== 'tooltip' ? popup.open : undefined)}
          data-ui-collection={ui?.collection?.domId}
          data-ui-collection-item={selectable?.collectionId}
          data-ui-collection-key={selectable?.key}
          data-ui-selectable={selectable ? '' : undefined}
          data-ui-form-scope={ui?.form ? '' : undefined}
          aria-selected={anchorProps['aria-selected'] ?? selectable?.checked}
          {...stateLinkProps(linkState, {
            onMouseEnter: composeEventHandlers(
              composeEventHandlers(motionHandlers?.onMouseEnter, onMouseEnter),
              composeEventHandlers(prepare.onIntent, popupOptions ? popup.onMouseEnter : undefined),
            ),
            onMouseMove: composeEventHandlers(motionHandlers?.onMouseMove, onMouseMove),
            onMouseLeave: composeEventHandlers(composeEventHandlers(motionHandlers?.onMouseLeave, onMouseLeave), popupOptions ? popup.onMouseLeave : undefined),
            onMouseDown: composeEventHandlers(onMouseDown, selectable?.onMouseDown),
            onMouseUp,
            onClick: composeEventHandlers(composeEventHandlers(onClick, selectable?.onClick), popupOptions ? popup.onClick : undefined, { cancelable: true }),
            onFocus: composeEventHandlers(composeEventHandlers(onFocus, prepare.onIntent), popupOptions ? popup.onFocus : undefined),
            onBlur: composeEventHandlers(onBlur, popupOptions ? popup.onBlur : undefined),
          })}
          onContextMenu={composeEventHandlers(onContextMenu, popupOptions ? popup.onContextMenu : undefined, { cancelable: true })}
          onKeyDown={composeEventHandlers(
            composeEventHandlers(composeEventHandlers(onKeyDown, popupOptions ? popup.onKeyDown : undefined, { cancelable: true }), selectable?.onKeyDown, { cancelable: true }),
            nestedEnter, { cancelable: true })}
          onAnimationEnd={contentMotion.onAnimationEnd}
          onSubmit={ui?.form && as === 'form' && !isLink ? (event: React.SubmitEvent<HTMLElement>) => {
            if (event.target !== event.currentTarget) return;
            onSubmit?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            if (!ui.form?.disabled && ui.form?.ready) void ui.form.submit();
          } : onSubmit}
        >
          {scopedChildren}
        </Comp>
      )}
    </FlexFrame>
  );
}

/** Keep the interaction provider around only the host, not its sibling popup.
 * Collapse retains ownership of the existing wrapper and motion lifecycle.
 */
function FlexFrame({ target, track, onChange, hasPopup, popup, collapse, children }: {
  target: React.RefObject<HTMLElement | null>;
  track: boolean;
  onChange?: FlexProps['onInteractionChange'];
  hasPopup: boolean;
  popup: React.ReactNode;
  collapse?: Omit<CollapseWrapProps, 'children'>;
  children: (active: boolean) => React.ReactNode;
}) {
  const scoped = track ? (
    <InteractionScope target={target} onChange={onChange}>{children}</InteractionScope>
  ) : children(false);
  if (!collapse) return hasPopup ? <>{scoped}{popup}</> : scoped;
  return <CollapseWrap {...collapse}>{scoped}{popup}</CollapseWrap>;
}
