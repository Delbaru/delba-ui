'use client';

import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styles from './Tooltip.module.scss';

import { cx, stateProps, type WithRef } from '../../core';
import { Flex } from '../Flex';
import type { TooltipBubbleProps } from '../../hooks/useTooltip';

export interface TooltipProps extends TooltipBubbleProps {
  /** Inline host for tooltip bubbles rendered by inline controls. Default div. */
  as?: 'div' | 'span';
  children: ReactNode;
  className?: string;
  /** id всплывашки — чтобы на неё ссылался `aria-describedby` триггера. */
  id?: string;
  /**
   * Встроенная тёмная плашка (фон/паддинг/радиус/типографика). По умолчанию включена (как у Input).
   * Выключи (`false`), когда контент сам рисует поверхность — карточка, кастомный блок и т.п.
   */
  surface?: boolean;
}

/** Portal view for the positioning and visibility model supplied by useTooltip. */
export function Tooltip({
  ref,
  portalNode,
  style,
  placement,
  active,
  className,
  id,
  surface = true,
  as = 'div',
  children,
}: WithRef<TooltipProps, HTMLElement>) {
  if (!portalNode) return null;
  const Surface = as === 'span' ? 'span' : Flex;

  return createPortal(
    <Surface
        ref={ref}
        id={id}
        className={cx('Tooltip', styles.Tooltip, surface && styles.surface, className)}
        style={style}
        role="tooltip"
        aria-hidden={!active}
        data-placement={placement}
        {...stateProps(active && 'active')}
    >
      {children}
    </Surface>,
    portalNode,
  );
}
