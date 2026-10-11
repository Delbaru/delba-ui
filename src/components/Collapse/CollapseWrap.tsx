'use client';

import { useEffect, useImperativeHandle, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import type React from 'react';

import { cx, resolveResponsive, type ResponsiveValue, type Transition } from '../../core';
import { useCollapseMotion, type CollapseHandle } from '../../hooks/useCollapseMotion';

export interface CollapseWrapProps {
  open: boolean;
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
export interface CollapseOptions {
  /** Показывать компонент; значение задаёт владелец состояния. */
  open: boolean;
  /** Зазор перед открытым компонентом, [desktop, mobile, tablet]. */
  gap?: ResponsiveValue<number>;
  /** С какой стороны содержимого находится зазор. */
  gapSide?: 'start' | 'end';
  /** Менять прозрачность вместе с высотой. */
  fade?: boolean;
  /** Ось: `row` сворачивает высоту, `column` — ширину. */
  axis?: 'row' | 'column';
}

// `hidden="until-found"` React пишет как булев атрибут (`hidden=""`), поэтому значение ставит эффект.
// На сервере поддержку не узнать: первый HTML — с запасным `hidden` + `inert`, текст в нём всё равно есть.
const noSubscribe = () => () => {};
const supportsUntilFound = () => 'onbeforematch' in HTMLElement.prototype;

// Общая обёртка сворачивания для примитивов. Состояния покоя держит CSS (data-open), ход между
// ними ведёт useCollapseMotion. Flex и Text подключают одно поведение, не копируя анимацию.
export function CollapseWrap({ open, as = 'div', inline, axis = 'row', gap, gapSide = 'start', fade, overflowVisibleWhenOpen, appear, clip, keepMounted, onFound, onEnd, onTransition, handleRef, children }: CollapseWrapProps) {
  const { mounted, visualOpen, settled, wrapRef, innerRef, handle } = useCollapseMotion<HTMLElement>({
    open,
    axis,
    gapSide,
    appear,
    sizeOnInner: clip === true || axis === 'column',
    fade,
    keepMounted,
    onEnd,
    onTransition,
  });
  const untilFound = useSyncExternalStore(noSubscribe, supportsUntilFound, () => false);
  const onFoundRef = useRef(onFound);
  const concealed = keepMounted === true && !mounted;

  useImperativeHandle(handleRef, () => handle, [handle]);

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
      node.setAttribute('data-open', '');
      onFoundRef.current?.();
    };
    node.addEventListener('beforematch', onBeforeMatch);
    return () => node.removeEventListener('beforematch', onBeforeMatch);
  }, [wrapRef, keepMounted]);

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
      ref={(node) => { wrapRef.current = node; }}
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
        ref={(node) => { innerRef.current = node; }}
        className={cx('ui-collapse-inner', clip && 'ui-collapse-clip', overflowVisibleWhenOpen && settled && 'ui-collapse-visible')}
      >
        {children}
      </Tag>
    </Tag>
  );
}
