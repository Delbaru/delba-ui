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
import { CollapseWrap, type CollapseOptions } from '../Collapse/CollapseWrap';
import { InteractionScope } from '../../core/InteractionScope';
import { FormContext } from '../../core/Form';
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
  const { box, rest } = splitBoxLayout(props);
  const layout = boxLayout(c, { ...scroll?.layout, ...box });
  const collapseInput = ui?.collapse?.settings ?? collapse;
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
    children,
    onAnimationEnd: anchorProps.onAnimationEnd,
  });
  const interactionRef = useRef<HTMLElement>(null);
  const surfaceRef = useMergedRefs(ref, interactionRef);
  const setRefs = useMergedRefs(setMotionNode, contentMotion.ref, surfaceRef);

  const selectable = ui?.selectable;
  let scopedChildren = contentMotion.children;
  if (ui?.form) scopedChildren = <FormContext form={ui.form}>{scopedChildren}</FormContext>;
  if (ui?.collection) scopedChildren = <CollectionContext collection={ui.collection}>{scopedChildren}</CollectionContext>;
  const content = (active = false) => (
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
      tabIndex={anchorProps.tabIndex ?? (selectable ? 0 : undefined)}
      aria-selected={anchorProps['aria-selected'] ?? selectable?.checked}
      {...stateLinkProps(linkState, {
        onMouseEnter: composeEventHandlers(
          composeEventHandlers(motionHandlers?.onMouseEnter, onMouseEnter),
          prepare.onIntent,
        ),
        onMouseMove: composeEventHandlers(motionHandlers?.onMouseMove, onMouseMove),
        onMouseLeave: composeEventHandlers(motionHandlers?.onMouseLeave, onMouseLeave),
        onMouseDown: composeEventHandlers(onMouseDown, selectable?.onMouseDown),
        onMouseUp,
        onClick: composeEventHandlers(onClick, selectable?.onClick),
        onFocus: composeEventHandlers(onFocus, prepare.onIntent),
        onBlur,
      })}
      onKeyDown={composeEventHandlers(onKeyDown, selectable?.onKeyDown)}
      onAnimationEnd={contentMotion.onAnimationEnd}
      onSubmit={ui?.form && as === 'form' && !isLink ? (event: React.FormEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        onSubmit?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (!ui.form?.disabled && ui.form?.ready) void ui.form.submit();
      } : onSubmit}
    >
      {scopedChildren}
    </Comp>
  );

  const scopedContent =
    trackInteraction || onInteractionChange ? (
      <InteractionScope target={interactionRef} onChange={onInteractionChange}>
        {content}
      </InteractionScope>
    ) : (
      content()
    );

  if (collapseInput === undefined) {
    return scopedContent;
  }

  const collapseOptions: CollapseOptions =
    typeof collapseInput === 'boolean' ? { open: collapseInput } : collapseInput;

  // По высоте рамку держит сам Flex: он сжимается с треком и клипает своё содержимое. minH
  // сжаться не даст — тогда клипает внутренний слой, как раньше.
  return (
    <CollapseWrap
        open={collapseOptions.open}
        defaultOpen={collapseOptions.defaultOpen}
        onOpenChange={collapseOptions.onOpenChange}
        clip={box.minH != null}
        axis={collapseOptions.axis ?? collapseAxis}
        gap={collapseOptions.gap ?? collapseGap}
        gapSide={collapseOptions.gapSide}
        fade={collapseOptions.fade ?? collapseFade}
        overflowVisibleWhenOpen={collapseOptions.overflowVisibleWhenOpen ?? collapseOverflowVisible}
        appear={collapseOptions.appear ?? collapseAppear}
        keepMounted={collapseOptions.keepMounted ?? collapseKeepMounted}
        onFound={collapseOptions.onFound ?? onCollapseFound}
        onEnd={collapseOptions.onEnd ?? onCollapseEnd}
        onTransition={collapseOptions.onTransition ?? onTransition}
        handleRef={collapseOptions.ref ?? collapseRef}
    >
      {scopedContent}
    </CollapseWrap>
  );
}
