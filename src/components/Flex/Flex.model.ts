'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useRef } from 'react';
import {
    boxLayout,
    containerClass,
    createLayoutClasses,
    cx,
    splitBoxLayout,
    stateProps,
    type WithRef,
} from '#core';
import { useInteractiveElement } from '#core/Element';
import { useAsyncContent } from '../../core/Async/Async';
import { formSurfaceEvents } from '../../core/Form/Surface';
import { useScrollSurface } from '#core/Scroll';
import { scrollFadeClass } from '../../core/Scroll/ScrollFade';
import { resolvePopupOptions } from '../../core/Popup/Popup';
import { resolveContentAnimate } from '../../hooks/contentMotion';
import { useContentMotion } from '../../hooks/useContentMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { FlexProps } from './Flex.types';
import styles from './Flex.module.scss';

const c = createLayoutClasses();

export function useFlex(input: WithRef<FlexProps, HTMLElement>) {
    const {
        ref,
        as = 'div',
        children,
        ui,
        className,
        style,
        display,
        gap,
        rowGap,
        columnGap,
        dir,
        justify,
        align,
        wrap,
        container,
        state,
        trackInteraction,
        onInteractionChange,
        motionScope,
        scrollFade,
        perspective3d,
        parallax,
        animate,
        linkState,
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
        ...props
    } = resolvePresetProps(input);
    const { box, rest } = splitBoxLayout(props);
    const scroll = useScrollSurface(ui?.scroll);
    const collapseInput = ui?.collapse?.settings ?? collapse;
    const collapseOptions: CollapseOptions | undefined =
        typeof collapseInput === 'boolean' ? { open: collapseInput } : collapseInput;
    const popup = resolvePopupOptions(collapseOptions?.open === false ? undefined : ui?.popup);
    const asyncContent = useAsyncContent(ui?.async, children);
    const contentMotion = useContentMotion({
        ...resolveContentAnimate(animate?.change),
        children: asyncContent.children,
        onAnimationEnd: rest.onAnimationEnd,
    });
    const interactionRef = useRef<HTMLElement>(null);
    const form = formSurfaceEvents(ui?.form, as === 'form' && !rest.href, rest.onSubmit);
    const selectable = ui?.selectable;
    const fade = scroll?.fade ?? scrollFade;
    const element = useInteractiveElement({
        as,
        ref,
        refs: [contentMotion.ref, interactionRef, scroll?.ref],
        motion: { perspective3d, parallax, animate, open: ui?.motion?.open },
        popup,
        linkState,
        style: scroll?.style,
        tailStyle: contentMotion.style,
        className: cx(
            styles.Flex,
            containerClass(container),
            ...boxLayout(c, { ...scroll?.layout, ...box }),
            ...c.value('display', display),
            ...c.value('gap', gap),
            ...c.value('rowGap', rowGap),
            ...c.value('columnGap', columnGap),
            ...c.value('dir', dir),
            ...c.value('justify', justify),
            ...c.value('align', align),
            ...c.value('wrap', wrap),
            scrollFadeClass(fade === true ? 'y' : fade),
            scroll?.className,
            contentMotion.className,
            className,
        ),
        root: {
            ...rest,
            style,
            onSubmit: form.onSubmit,
            onAnimationEnd: contentMotion.onAnimationEnd,
            tabIndex:
                rest.tabIndex ??
                (selectable || (popup && popup.preset !== 'tooltip') ? 0 : undefined),
            'aria-busy': rest['aria-busy'] ?? asyncContent.busy,
            'aria-selected': rest['aria-selected'] ?? selectable?.checked,
        },
        events: [
            {
                handlers: {
                    onMouseDown: selectable?.onMouseDown,
                    onClick: selectable?.onClick,
                },
            },
        ],
        afterEvents: [
            {
                handlers: {
                    onKeyDown: selectable?.onKeyDown,
                },
                cancelable: true,
            },
            {
                handlers: { onKeyDown: form.onKeyDown },
                cancelable: true,
            },
        ],
    });
    const collapseLayout =
        !display ||
        display.some((value) => value === null || value === 'flex' || value === 'inline-flex');
    return {
        host: element.host,
        html: rest.dangerouslySetInnerHTML != null,
        effects: element.effects,
        children: contentMotion.children,
        scope: { ...ui, smooth: scroll?.scope },
        root: (active: boolean) => ({
            ...element.root,
            ...stateProps(state, trackInteraction && active && 'interacting'),
            'data-ui-collapse-layout': collapseLayout ? '' : undefined,
            'data-motion-scope': motionScope ? '' : undefined,
            'data-scroll-axis':
                scroll?.axis ?? (rest as { 'data-scroll-axis'?: string })['data-scroll-axis'],
            'data-scroll-preset':
                scroll?.preset ?? (rest as { 'data-scroll-preset'?: string })['data-scroll-preset'],
            'data-ui-collection': ui?.collection?.domId,
            'data-ui-collection-item': selectable?.collectionId,
            'data-ui-collection-key': selectable?.key,
            'data-ui-selectable': selectable ? '' : undefined,
            'data-ui-form-scope': ui?.form ? '' : undefined,
        }),
        frame: {
            popup: element.popup,
            interaction:
                trackInteraction || onInteractionChange
                    ? {
                          target: interactionRef,
                          onChange: onInteractionChange,
                      }
                    : undefined,
            collapse: collapseOptions
                ? {
                      ...collapseOptions,
                      ref: undefined,
                      clip: box.minH != null,
                      axis: collapseOptions.axis ?? collapseAxis,
                      gap: collapseOptions.gap ?? collapseGap,
                      fade: collapseOptions.fade ?? collapseFade,
                      overflowVisibleWhenOpen:
                          collapseOptions.overflowVisibleWhenOpen ?? collapseOverflowVisible,
                      appear: collapseOptions.appear ?? collapseAppear,
                      keepMounted: collapseOptions.keepMounted ?? collapseKeepMounted,
                      onFound: collapseOptions.onFound ?? onCollapseFound,
                      onEnd: collapseOptions.onEnd ?? onCollapseEnd,
                      onTransition: collapseOptions.onTransition ?? onTransition,
                      handleRef: collapseOptions.ref ?? collapseRef,
                  }
                : undefined,
        },
    };
}
