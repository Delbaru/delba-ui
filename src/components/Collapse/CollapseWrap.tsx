'use client';

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import type React from 'react';
import { flushSync } from 'react-dom';

import { cx, resolveResponsive, useMergedRefs, type ResponsiveValue, type Transition } from '../../core';
import { useCollapseMotion, type CollapseHandle } from '../../hooks/useCollapseMotion';
import { useCollapseControls, type CollapseControls } from '../../hooks/useCollapseControls';

export interface CollapseWrapProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    ref?: React.Ref<CollapseControls> | React.Ref<CollapseHandle>;
    as?: 'div' | 'span';
    inline?: boolean;
    axis?: 'row' | 'column';
    gap?: ResponsiveValue<number>;
    gapSide?: 'start' | 'end';
    fade?: boolean;
    overflowVisibleWhenOpen?: boolean;
    appear?: boolean;
    clip?: boolean;
    keepMounted?: boolean;
    onFound?: () => void;
    onEnd?: () => void;
    onTransition?: (transition: Transition) => void;
    handleRef?: React.Ref<CollapseHandle>;
    children: React.ReactNode;
}

/** Общий короткий договор для сворачивания целого компонента. */
export interface CollapseSettings {
    /** Команды show/hide/toggle; DOM ref компонента остаётся отдельным. */
    ref?: React.Ref<CollapseControls> | React.Ref<CollapseHandle>;
    /** Запрос изменения состояния. В управляемом режиме владелец должен принять его через open. */
    onOpenChange?: (open: boolean) => void;
    /** Сохранять закрытое содержимое в DOM, недоступным для фокуса. */
    keepMounted?: boolean;
    /** Вызывается при находке браузерным поиском. */
    onFound?: () => void;
    /** Завершение раскрытия или закрытия. */
    onEnd?: () => void;
    /** Начавшийся переход для композиции. */
    onTransition?: (transition: Transition) => void;
    /** Снять обрезку после раскрытия для вложенных панелей. */
    overflowVisibleWhenOpen?: boolean;
    /** Анимировать изначально открытый компонент. */
    appear?: boolean;
    /** Зазор перед открытым компонентом, [desktop, mobile, tablet]. */
    gap?: ResponsiveValue<number>;
    /** С какой стороны содержимого находится зазор. */
    gapSide?: 'start' | 'end';
    /** Менять прозрачность вместе с высотой. */
    fade?: boolean;
    /** Ось: `row` сворачивает высоту, `column` — ширину. */
    axis?: 'row' | 'column';
}

/** Управляемое состояние либо начальное состояние; два владельца одновременно запрещены. */
export type CollapseOptions = CollapseSettings & ({ open: boolean; defaultOpen?: never } | { open?: never; defaultOpen: boolean });

// `hidden="until-found"` React пишет как булев атрибут (`hidden=""`), поэтому значение ставит эффект.
// На сервере поддержку не узнать: первый HTML — с запасным `hidden` + `inert`, текст в нём всё равно есть.
const noSubscribe = () => () => {};
const supportsUntilFound = () => 'onbeforematch' in HTMLElement.prototype;

// Общая обёртка сворачивания для примитивов. Состояния покоя держит CSS (data-open), ход между
// ними ведёт useCollapseMotion. Flex и Text подключают одно поведение, не копируя анимацию.
export function CollapseWrap({
    open,
    defaultOpen,
    onOpenChange,
    ref,
    as = 'div',
    inline,
    axis = 'row',
    gap,
    gapSide = 'start',
    fade,
    overflowVisibleWhenOpen,
    appear,
    clip,
    keepMounted,
    onFound,
    onEnd,
    onTransition,
    handleRef,
    children,
}: CollapseWrapProps) {
    const state = useCollapseControls({ open, defaultOpen, onOpenChange });
    const motion = useCollapseMotion<HTMLElement>({
        open: state.open,
        axis,
        gapSide,
        appear,
        sizeOnInner: clip === true || axis === 'column',
        fade,
        keepMounted,
        onEnd,
        onTransition: (transition) => {
            state.onTransition(transition);
            onTransition?.(transition);
        },
    });
    const { mounted, visualOpen, settled, wrapRef, innerRef } = motion;
    state.motion.current = motion;
    useLayoutEffect(() => {
        state.complete(motion);
    });
    const untilFound = useSyncExternalStore(noSubscribe, supportsUntilFound, () => false);
    const onFoundRef = useRef(onFound);
    const concealed = keepMounted === true && !mounted;

    const controlsRef = useMergedRefs<CollapseHandle>(handleRef, ref);
    useImperativeHandle(controlsRef, () => state.controls, [state.controls]);

    useEffect(() => {
        onFoundRef.current = onFound;
    });

    useEffect(() => {
        const node = wrapRef.current;
        if (!node || !keepMounted || !untilFound) return;
        if (concealed) node.setAttribute('hidden', 'until-found');
        else node.removeAttribute('hidden');
    }, [wrapRef, keepMounted, untilFound, concealed]);

    useEffect(() => {
        const node = wrapRef.current;
        if (!node || !keepMounted) return undefined;
        const onBeforeMatch = () => {
            node.setAttribute('data-instant', '');
            // Браузер прокручивает сразу после события: принять состояние и обновить DOM должен React.
            flushSync(() => {
                void state.controls.show();
                onFoundRef.current?.();
            });
            if (!state.controls.open) {
                node.removeAttribute('data-instant');
                // beforematch не отменяем: браузер снимет hidden после обработчика даже при отказе владельца.
                queueMicrotask(() => {
                    if (wrapRef.current === node && !state.controls.open) node.setAttribute('hidden', untilFound ? 'until-found' : '');
                });
            }
        };
        node.addEventListener('beforematch', onBeforeMatch);
        return () => node.removeEventListener('beforematch', onBeforeMatch);
    }, [wrapRef, keepMounted, state.controls, untilFound]);

    useEffect(() => {
        const node = wrapRef.current;
        if (!node || !visualOpen || !node.hasAttribute('data-instant')) return;
        node.removeAttribute('data-instant');
    }, [wrapRef, visualOpen]);

    if (!mounted && !keepMounted) return null;

    // Зазор движок меряет у CSS; для разных брейкпоинтов JS не дублирует измерение.
    const collapseStyle: Record<string, string> = {};
    if (gap != null) {
        const [gapD, gapM, gapT] = resolveResponsive(gap);
        if (gapD != null) collapseStyle['--collapse-gap-d'] = `calc(${gapD} * var(--rpx))`;
        if (gapM != null) collapseStyle['--collapse-gap-m'] = `calc(${gapM} * var(--rpx))`;
        if (gapT != null) collapseStyle['--collapse-gap-t'] = `calc(${gapT} * var(--rpx))`;
    }

    const searchable = concealed && untilFound;
    const Tag: React.ElementType = as;

    return (
        <Tag
            ref={(node) => {
                wrapRef.current = node;
            }}
            className={cx('ui-collapse', inline && 'ui-collapse-inline', fade && 'ui-collapse-fade')}
            data-axis={axis}
            data-gap-side={gapSide}
            data-open={visualOpen || undefined}
            data-settled={settled || undefined}
            hidden={(concealed && !untilFound) || undefined}
            inert={!visualOpen && !searchable}
            style={collapseStyle as CSSProperties}
        >
            <Tag
                ref={(node) => {
                    innerRef.current = node;
                }}
                className={cx('ui-collapse-inner', clip && 'ui-collapse-clip', overflowVisibleWhenOpen && settled && 'ui-collapse-visible')}
            >
                {children}
            </Tag>
        </Tag>
    );
}
