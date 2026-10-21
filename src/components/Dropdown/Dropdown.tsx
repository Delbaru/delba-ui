'use client';

import { cloneElement, createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type MouseEventHandler, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { composeEventHandlers, cx, stateProps, useMergedRefs, type ComponentStateValue, type WithRef } from '../../core';
import { useAnchoredFloating } from '../../hooks/useAnchoredFloating';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';
import { useCollapseState } from '../../hooks/useCollapseState';
import { Box, type BoxProps } from '../Box';
import { CollapseWrap, type CollapseSettings } from '../Collapse/CollapseWrap';
import { composeDropdownTriggerClick } from './trigger';
import styles from './Dropdown.module.scss';
import { useInteractionActivity } from '../../core/InteractionScope';

export interface DropdownTriggerProps {
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

export interface DropdownPanelOptions extends Omit<BoxProps, 'children' | 'collapse'> {
  /** DOM data-атрибуты поверхности панели, включая проектные маркеры портала. */
  [attribute: `data-${string}`]: string | number | boolean | undefined;
  /** Край триггера, к которому прижата панель. */
  side?: 'start' | 'center' | 'end';
  /** Зазор от триггера в дизайн-единицах. */
  offset?: number;
  /** Вынести панель из обрезающего контейнера в слой страницы или активной Modal. */
  portal?: boolean;
  /** Растянуть панель по ширине триггера. */
  matchTriggerWidth?: boolean;
  /** Сохранять закрытое содержимое в DOM; false удаляет его после анимации закрытия. */
  keepMounted?: boolean;
  /** CSS-переменные оформления, которые нужно перенести из корня в портал. */
  inheritVariables?: readonly `--${string}`[];
  /** Настройки общего collapse; открытие определяется состоянием Dropdown. */
  collapse?: Omit<CollapseSettings, 'ref' | 'onOpenChange' | 'keepMounted' | 'onFound'>;
}

interface DropdownBaseProps extends Omit<BoxProps, 'children'> {
  /** Закрывающий клик не активирует содержимое страницы под панелью. */
  blockOutsideClick?: boolean;
  /** Пользовательский onClick выполняется первым; preventDefault отменяет переключение. */
  trigger: ReactElement<DropdownTriggerProps>;
  /** Содержимое панели; функция получает команду закрытия. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Размещение, оформление и раскрытие выпадающей панели. */
  panel?: DropdownPanelOptions;
  /** Состояния оформления корня и его портальной области. */
  state?: ComponentStateValue;
}

export type DropdownProps = DropdownBaseProps & (
  | {
      /** Управляемое открытие: единственный владелец — вызывающий компонент. */
      open: boolean;
      /** Запрос изменить открытие; Dropdown не хранит его вторую копию. */
      onOpenChange: (open: boolean) => void;
      defaultOpen?: never;
    }
  | {
      open?: undefined;
      /** Начальное открытие в неуправляемом режиме. */
      defaultOpen?: boolean;
      /** Уведомление об открытии и закрытии в неуправляемом режиме. */
      onOpenChange?: (open: boolean) => void;
    }
);

const NO_VARIABLES: readonly `--${string}`[] = [];
const VIEWPORT_PADDING = 8;
const DropdownAncestors = createContext<readonly string[]>([]);

function focusableItems(panel: HTMLElement | null) {
  return [...(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? [])]
    .filter((node) => !node.closest('[hidden], [inert]') && node.getClientRects().length > 0);
}

export function Dropdown({
  ref,
  trigger,
  children,
  panel = {},
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  style,
  collapse,
  state,
  onKeyDown,
  onBlur,
  blockOutsideClick = false,
  ...rootProps
}: WithRef<DropdownProps, HTMLDivElement>) {
  const {
    side = 'start', offset = 8, portal = false, matchTriggerWidth = false, keepMounted = true,
    inheritVariables = NO_VARIABLES, collapse: panelCollapse, ...panelProps
  } = panel;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const requestedOpen = controlledOpen ?? internalOpen;
  const rootCollapse = useCollapseState(collapse ?? { open: true });
  const { defaultOpen: _defaultCollapseOpen, ...collapseSettings } = collapse ?? {};
  const disabled = trigger.props.disabled || trigger.props['aria-disabled'] === true || trigger.props['aria-disabled'] === 'true';
  const blocked = disabled || !rootCollapse.open;
  const open = requestedOpen && !blocked;
  useInteractionActivity(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<'first' | 'last' | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [rootNode, setRootNode] = useState<HTMLDivElement | null>(null);
  const setRootRef = useMergedRefs(rootRef, ref, setRootNode);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [gapPixels, setGapPixels] = useState(0);
  const id = useId();
  const parentIds = useContext(DropdownAncestors);
  const ownIds = [...parentIds, id];

  useLayoutEffect(() => {
    const triggerNode = rootRef.current?.firstElementChild;
    anchorRef.current = triggerNode instanceof HTMLElement
      ? triggerNode.matches('button, a[href], [tabindex]') ? triggerNode
        : triggerNode.querySelector<HTMLElement>('button, a[href], [tabindex]') ?? triggerNode
      : null;
  });

  const changeOpen = (next: boolean) => {
    if (next === requestedOpen || (next && blocked)) return;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const close = () => {
    focusOnOpen.current = null;
    if (!open) return;
    if (panelRef.current?.contains(document.activeElement)) {
      anchorRef.current?.focus();
    }
    changeOpen(false);
  };
  const dismissProps = useOutsideDismiss([rootRef, panelRef], close, { enabled: open, escape: false, blockOutsideClick });
  const { style: floatingStyle, updatePosition } = useAnchoredFloating({
    anchorRef, floatingRef: panelRef, isActive: portal && open,
    placement: 'bottom', align: side, gap: gapPixels, viewportPadding: VIEWPORT_PADDING,
    keepPositionWhenInactive: true,
  });

  useEffect(() => {
    if (requestedOpen && blocked) {
      if (controlledOpen === undefined) setInternalOpen(false);
      onOpenChange?.(false);
    }
  }, [requestedOpen, blocked, controlledOpen, onOpenChange]);

  useLayoutEffect(() => {
    const modal = rootRef.current?.closest<HTMLElement>('[role="dialog"][aria-modal="true"]');
    setPortalNode(portal ? modal?.parentElement ?? document.body : null);
  }, [portal, rootNode]);

  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focus = () => {
      const direction = focusOnOpen.current;
      if (!direction) return;
      if (!anchorRef.current?.contains(document.activeElement)) {
        focusOnOpen.current = null;
        observer.disconnect();
        return;
      }
      const items = focusableItems(panel);
      const next = direction === 'first' ? items[0] : items.at(-1);
      if (!next) return;
      focusOnOpen.current = null;
      observer.disconnect();
      next.focus();
    };
    // Collapse may mount its children or remove hidden after the opening commit.
    const observer = new MutationObserver(focus);
    observer.observe(panel, { childList: true, subtree: true, attributes: true });
    const frame = requestAnimationFrame(focus);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [open, portalNode]);

  useLayoutEffect(() => {
    const sync = () => {
      const width = probeRef.current?.getBoundingClientRect().width;
      if (width !== undefined) setGapPixels(Math.sign(offset) * width);
      const root = rootRef.current;
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (root && anchor && panel) {
        const triggerRect = anchor.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const left = triggerRect.left - rootRect.left - root.clientLeft;
        panel.style.setProperty('--dropdown-anchor-start', `${left}px`);
        panel.style.setProperty('--dropdown-anchor-center', `${left + triggerRect.width / 2}px`);
        panel.style.setProperty('--dropdown-anchor-end', `${left + triggerRect.width}px`);
        panel.style.setProperty('--dropdown-anchor-bottom', `${triggerRect.bottom - rootRect.top - root.clientTop}px`);
        panel.style.setProperty('--dropdown-anchor-width', `${triggerRect.width}px`);
      }
      const scope = scopeRef.current;
      if (!root || !scope) return;
      const computed = getComputedStyle(root);
      for (const variable of inheritVariables) {
        const value = computed.getPropertyValue(variable).trim();
        if (value) scope.style.setProperty(variable, value);
        else scope.style.removeProperty(variable);
      }
    };
    sync();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    if (rootRef.current) observer?.observe(rootRef.current);
    if (anchorRef.current) observer?.observe(anchorRef.current);
    window.addEventListener('resize', sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [rootNode, portal, portalNode, offset, matchTriggerWidth, inheritVariables, className, style]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    focusOnOpen.current = null;
    const next = event.relatedTarget;
    if (next instanceof Element && next.closest('[data-dropdown-ancestors]')?.getAttribute('data-dropdown-ancestors')?.split(' ').includes(id)) return;
    if (next instanceof Node && !rootRef.current?.contains(next) && !panelRef.current?.contains(next)) close();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const atTrigger = !!anchorRef.current?.contains(target);
    const inPanel = !!panelRef.current?.contains(target);
    if (!(atTrigger || inPanel)) return;
    const items = focusableItems(panelRef.current);
    if (open && event.key === 'Tab' && atTrigger && !event.shiftKey && items[0]) {
      event.preventDefault();
      event.stopPropagation();
      items[0].focus();
      return;
    }
    if (atTrigger && !target.matches('input, textarea, select, [contenteditable="true"]') && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      event.stopPropagation();
      if (blocked) return;
      if (!open) {
        focusOnOpen.current = event.key === 'ArrowDown' ? 'first' : 'last';
        changeOpen(true);
        return;
      }
      const next = event.key === 'ArrowDown' ? items[0] : items.at(-1);
      next?.focus();
      return;
    }
    if (open && inPanel && !target.matches('input, textarea, select, [contenteditable="true"]') && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      const at = items.indexOf(target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : event.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      if (items[next]) { event.preventDefault(); event.stopPropagation(); items[next].focus(); }
      return;
    }
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };
  const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) close();
  };
  const content = (
    <Box
      ref={panelRef}
      id={id}
      data-dropdown-ancestors={ownIds.join(' ')}
      className={cx(styles.panel, portal && styles.portalPanel)}
      style={{
        '--dropdown-offset': `calc(${offset} * var(--rpx))`,
        '--dropdown-viewport-padding': `${VIEWPORT_PADDING}px`,
        ...(portal ? floatingStyle : null),
      } as CSSProperties}
      data-side={side}
      data-open={open || undefined}
      data-match-width={matchTriggerWidth || undefined}
      aria-hidden={!open}
      inert={!open}
      onMouseDownCapture={dismissProps.onMouseDownCapture}
      onClick={handlePanelClick}
    >
      <CollapseWrap
        {...panelCollapse}
        open={open}
        fade={panelCollapse?.fade ?? true}
        keepMounted={keepMounted}
        onTransition={(transition) => {
          updatePosition();
          panelCollapse?.onTransition?.(transition);
        }}
      >
        <Box {...panelProps} className={cx(styles.surface, panelProps.className)}>
          {typeof children === 'function' ? children(close) : children}
        </Box>
      </CollapseWrap>
    </Box>
  );

  return (
    <DropdownAncestors.Provider value={ownIds}>
    <Box
      {...rootProps}
      ref={setRootRef}
      collapse={collapse ? {
        ...collapseSettings,
        open: rootCollapse.open,
        onOpenChange: rootCollapse.changeOpen,
      } : undefined}
      className={cx(styles.Dropdown, className)}
      style={style}
      {...stateProps(state)}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown, { cancelable: true })}
      onBlur={composeEventHandlers(onBlur, handleBlur, { cancelable: true })}
    >
      {cloneElement(trigger, {
        onClick: composeDropdownTriggerClick(trigger.props.onClick, disabled, () => {
          focusOnOpen.current = null;
          changeOpen(!open);
        }),
        'aria-expanded': open,
        'aria-controls': trigger.props['aria-controls'] ?? id,
      })}
      <Box ref={probeRef} className={styles.gapProbe} aria-hidden style={{ width: `calc(${Math.abs(offset)} * var(--rpx))` }} />
      {portal && portalNode ? createPortal(
        <Box ref={scopeRef} className={cx(styles.PortalRoot, className)} style={style} {...stateProps(state)}>{content}</Box>, portalNode,
      ) : content}
    </Box>
    </DropdownAncestors.Provider>
  );
}
