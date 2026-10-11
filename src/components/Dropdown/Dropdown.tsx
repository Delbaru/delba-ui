'use client';

import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type MouseEventHandler, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styles from './Dropdown.module.scss';

import { cx } from '../../core';
import { useAnchoredFloating } from '../../hooks/useAnchoredFloating';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';
import { composeDropdownTriggerClick } from './trigger';

export interface DropdownTriggerProps {
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  'aria-expanded': boolean;
  'aria-controls': string;
}

export interface DropdownProps {
  /** Кнопка-триггер: обработчик вызывающего выполняется первым; `preventDefault` отменяет переключение. */
  trigger: ReactElement<DropdownTriggerProps>;
  /** Содержимое панели — вёрстка целиком за вызывающим; функция получает `close`. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Край триггера, к которому прижата панель. */
  side?: 'start' | 'center' | 'end';
  /** Зазор от триггера, дизайн-единицы. */
  offset?: number;
  /** Рендерить панель вне обрезающего контейнера; по умолчанию сохраняется обычная вложенная панель. */
  portal?: boolean;
  className?: string;
}

export function Dropdown({ trigger, children, side = 'start', offset = 8, portal = false, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  // Выключенный триггер панель не держит: иначе она висела бы открытой без способа закрыть кликом.
  if (open && trigger.props.disabled) setOpen(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const gapProbeRef = useRef<HTMLSpanElement>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [gapPixels, setGapPixels] = useState(0);
  const id = useId();

  const close = () => {
    if (rootRef.current?.contains(document.activeElement) || panelRef.current?.contains(document.activeElement)) {
      rootRef.current?.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(id)}"]`)?.focus();
    }
    setOpen(false);
  };

  const dismissProps = useOutsideDismiss([rootRef, panelRef], close, { enabled: open });
  const { style: floatingStyle } = useAnchoredFloating({
    anchorRef: rootRef,
    floatingRef: panelRef,
    isActive: portal && open,
    placement: 'bottom',
    align: side === 'center' ? 'center' : side === 'end' ? 'end' : 'start',
    gap: gapPixels,
    viewportPadding: 8,
    keepPositionWhenInactive: true,
  });

  useEffect(() => {
    if (!portal) {
      setPortalNode(null);
      return;
    }

    const modal = rootRef.current?.closest<HTMLElement>('[role="dialog"][aria-modal="true"]');
    // The modal root is outside its scroll-clipped panel but keeps the popup in the right modal layer.
    setPortalNode(modal?.parentElement ?? document.body);
  }, [portal]);

  useLayoutEffect(() => {
    if (!portal) return;

    const measureGap = () => {
      const width = gapProbeRef.current?.getBoundingClientRect().width;
      if (width !== undefined) setGapPixels(Math.sign(offset) * width);
    };

    measureGap();
    window.addEventListener('resize', measureGap);
    return () => window.removeEventListener('resize', measureGap);
  }, [offset, portal]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && !rootRef.current?.contains(nextTarget) && !panelRef.current?.contains(nextTarget)) {
      setOpen(false);
    }
  };

  // Escape closes this panel before the containing dialog sees a later Escape.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const onPanelClick = (event: MouseEvent) => {
    if ((event.target as Element).closest('a[href]')) setOpen(false);
  };

  const onTriggerClick = composeDropdownTriggerClick(
    trigger.props.onClick,
    trigger.props.disabled,
    () => setOpen((value) => !value),
  );

  const panel = (
    <div
      id={id}
      ref={panelRef}
      className={cx(styles.panel, portal && styles.portalPanel, className)}
      style={{
        '--dropdown-offset': `calc(${offset} * var(--rpx))`,
        ...(portal ? floatingStyle : null),
      } as CSSProperties}
      data-side={side}
      data-open={open || undefined}
      aria-hidden={!open}
      inert={!open}
      onMouseDownCapture={dismissProps.onMouseDownCapture}
      onClick={onPanelClick}
    >
      {typeof children === 'function' ? children(close) : children}
    </div>
  );

  const panelContent = portal && portalNode
    ? createPortal(
        <div className={cx(styles.Dropdown, styles.PortalRoot)} aria-hidden={!open} inert={!open}>
          {panel}
        </div>,
        portalNode,
      )
    : panel;

  return (
    <div ref={rootRef} className={styles.Dropdown} onKeyDown={onKeyDown} onBlur={handleBlur}>
      {cloneElement(trigger, { onClick: onTriggerClick, 'aria-expanded': open, 'aria-controls': id })}
      <span
        ref={gapProbeRef}
        className={styles.gapProbe}
        aria-hidden
        style={{ width: `calc(${Math.abs(offset)} * var(--rpx))` }}
      />
      {panelContent}
    </div>
  );
}
