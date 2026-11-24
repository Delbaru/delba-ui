'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import {
  composeEventHandlers,
  preserveFocus as keepFocus,
  stateProps,
  useMergedRefs,
  type WithRef,
} from '../../core';
import { useFloatingSurface } from '../../hooks/useFloatingSurface';
import { useCollapseState } from '../../hooks/useCollapseState';
import { useSharedMotion } from '../../hooks/useSharedMotion';
import { useOpenPresence } from '../../hooks/useOpenPresence';
import { isOpenAnimate } from '../../core/reveal/reveal';
import type { CollapseSettings } from '../Collapse/CollapseWrap';
import { dropdownKeyboard } from './Dropdown.keyboard';
import { dropdownLayout } from './Dropdown.layout';
import { composeDropdownTriggerClick } from './trigger';
import { useInteractionActivity } from '../../core/InteractionScope';
import type { DropdownProps, DropdownChangeReason } from './Dropdown.types';

const NO_VARIABLES: readonly `--${string}`[] = [];
const VIEWPORT_PADDING = 8;
export const DropdownAncestors = createContext<readonly string[]>([]);

export function useDropdown({
  ref,
  trigger,
  anchorRef: externalAnchorRef,
  point,
  initialFocus,
  focusRegions = [],
  closeOn,
  keyboard = 'menu',
  preserveFocus = false,
  returnFocus,
  surfaceRef: externalSurfaceRef,
  children,
  panel = {},
  backdrop,
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
  const external = !trigger;
  const {
    side = 'start',
    offset = 8,
    portal = external,
    matchTriggerWidth = false,
    keepMounted = true,
    inheritVariables = NO_VARIABLES,
    collapse: panelCollapse,
    animate: panelAnimate,
    anchorRef: geometryAnchorRef,
    viewportPadding = VIEWPORT_PADDING,
    strategy = 'document',
    placement = 'bottom',
    boundaryRef,
    ...panelProps
  } = panel;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const requestedOpen = controlledOpen ?? internalOpen;
  const rootCollapse = useCollapseState(collapse ?? { open: true });
  const { defaultOpen: _defaultCollapseOpen, ...collapseSettings } = collapse ?? {};
  const disabled =
    trigger?.props.disabled ||
    trigger?.props['aria-disabled'] === true ||
    trigger?.props['aria-disabled'] === 'true';
  const blocked = disabled || !rootCollapse.open;
  const open = requestedOpen && !blocked;
  useInteractionActivity(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const openAnimate = isOpenAnimate(panelAnimate) ? panelAnimate : undefined;
  const { motionStyle, revealAttrs, setMotionNode } = useSharedMotion({
    animate: openAnimate,
    open,
  });
  const presence = useOpenPresence(open, Boolean(openAnimate));
  const setPresenceRef = useMergedRefs(presence.ref, setMotionNode);
  const setSurfaceRef = useMergedRefs(surfaceRef, externalSurfaceRef, setPresenceRef);
  const pointRef = useRef<HTMLElement | null>(null);
  // A closed point menu retains its document and opener through the closing commit.
  if (point !== null) {
    pointRef.current = point?.target ?? (typeof document === 'undefined' ? null : document.body);
  }
  const geometryRef = externalAnchorRef ?? (point !== undefined ? pointRef : geometryAnchorRef ?? anchorRef);
  const focusOnOpen = useRef<'first' | 'last' | null>(null);
  const closeFocusPolicy = useRef<'restore' | 'preserve' | null>(null);

  const scopeRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [rootNode, setRootNode] = useState<HTMLDivElement | null>(null);
  const setRootRef = useMergedRefs(rootRef, ref, setRootNode);
  const setPanelRef = useMergedRefs(panelRef, external ? ref : undefined);
  const [gapPixels, setGapPixels] = useState(0);
  const generatedId = useId();
  const id = external ? (rootProps.id ?? generatedId) : generatedId;
  const parentIds = useContext(DropdownAncestors);
  const ownIds = [...parentIds, id];

  useLayoutEffect(() => {
    const triggerNode = rootRef.current?.firstElementChild;
    const owner = rootRef.current?.ownerDocument.defaultView;
    anchorRef.current =
      owner && triggerNode instanceof owner.HTMLElement
        ? triggerNode.matches('button, a[href], [tabindex]')
          ? triggerNode
          : (triggerNode.querySelector<HTMLElement>('button, a[href], [tabindex]') ?? triggerNode)
        : null;
  });

  const changeOpen = (next: boolean, reason: DropdownChangeReason = 'trigger') => {
    if (next === requestedOpen || (next && blocked)) return;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next, reason);
  };
  const close = (reason: DropdownChangeReason = 'content') => {
    focusOnOpen.current = null;
    if (!open) return;
    const panel = panelRef.current;
    const ownsFocus = panel?.contains(panel.ownerDocument.activeElement);
    closeFocusPolicy.current =
      ownsFocus && reason !== 'outside' && reason !== 'blur' ? 'restore' : 'preserve';
    changeOpen(false, reason);
  };
  const floating = useFloatingSurface({
    open,
    portal,
    anchorRef: geometryRef,
    anchorPoint: point ?? undefined,
    positionRef: panelRef,
    boundaryRef,
    surfaceRef,
    regions: [rootRef, anchorRef, ...focusRegions],
    outsideRefs: point !== undefined ? [surfaceRef] : [externalAnchorRef ?? anchorRef, surfaceRef],
    placement,
    strategy,
    align: side,
    gap: gapPixels,
    viewportPadding,
    blockOutsideClick,
    onDismiss: close,
  });
  const { portalNode, style: floatingStyle, updatePosition, dismissProps } = floating;

  useEffect(() => {
    if (requestedOpen && blocked) {
      if (controlledOpen === undefined) setInternalOpen(false);
      onOpenChange?.(false, 'disabled');
    }
  }, [requestedOpen, blocked, controlledOpen, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    if (initialFocus) focusOnOpen.current = initialFocus;
    if (!focusOnOpen.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    const owner = panel.ownerDocument.defaultView;
    if (!owner) return;
    if (initialFocus) panel.focus({ preventScroll: true });
    const focus = () => {
      const direction = focusOnOpen.current;
      if (!direction) return;
      if (!initialFocus && !anchorRef.current?.contains(panel.ownerDocument.activeElement)) {
        focusOnOpen.current = null;
        observer.disconnect();
        return;
      }
      const items = dropdownKeyboard.items(panel);
      const next = direction === 'first' ? items[0] : items.at(-1);
      if (!next) return;
      focusOnOpen.current = null;
      observer.disconnect();
      next.focus({ preventScroll: true });
    };
    // Collapse may mount its children or remove hidden after the opening commit.
    const observer = new owner.MutationObserver(focus);
    observer.observe(panel, { childList: true, subtree: true, attributes: true });
    const frame = owner.requestAnimationFrame(focus);
    return () => {
      owner.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open, portalNode, initialFocus]);

  useLayoutEffect(() => {
    const owner = (rootRef.current ?? geometryRef.current)?.ownerDocument.defaultView;
    if (!owner) return;
    const sync = () =>
      setGapPixels(
        dropdownLayout.sync(
          {
            root: rootRef.current,
            anchor: geometryRef.current,
            panel: panelRef.current,
            probe: probeRef.current,
            scope: scopeRef.current ?? (external ? surfaceRef.current : null),
          },
          offset,
          inheritVariables,
        ),
      );
    sync();
    const observer = owner.ResizeObserver ? new owner.ResizeObserver(sync) : null;
    if (rootRef.current) observer?.observe(rootRef.current);
    if (geometryRef.current) observer?.observe(geometryRef.current);
    owner.addEventListener('resize', sync);
    return () => {
      observer?.disconnect();
      owner.removeEventListener('resize', sync);
    };
  }, [
    rootNode,
    portal,
    portalNode,
    offset,
    matchTriggerWidth,
    inheritVariables,
    className,
    style,
    geometryRef,
  ]);

  useLayoutEffect(() => {
    if (open) return;
    const target = returnFocus === false
      ? null
      : returnFocus?.current ?? (external ? geometryRef.current : anchorRef.current);
    const panel = panelRef.current;
    const ownerDocument = panel?.ownerDocument ?? target?.ownerDocument;
    const activeElement = ownerDocument?.activeElement;
    const removedFocusedChild =
      closeFocusPolicy.current === 'restore' && activeElement === ownerDocument?.body;
    if (
      closeFocusPolicy.current !== 'preserve' &&
      activeElement &&
      (panel?.contains(activeElement) || removedFocusedChild)
    ) {
      target?.focus({ preventScroll: true });
    }
    closeFocusPolicy.current = null;
  }, [open, returnFocus, external, geometryRef]);

  useLayoutEffect(() => {
    if (!open || returnFocus === false) return;
    const panel = panelRef.current;
    const target = returnFocus?.current ?? (external ? geometryRef.current : anchorRef.current);
    return () => {
      if (closeFocusPolicy.current !== 'preserve' && panel?.contains(panel.ownerDocument.activeElement)) {
        target?.focus({ preventScroll: true });
      }
    };
  }, [open, returnFocus, external, geometryRef, portalNode]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (closeOn?.blur === false) return;
    focusOnOpen.current = null;
    const next = event.relatedTarget;
    const owner = event.currentTarget.ownerDocument.defaultView;
    if (!owner) return;
    if (!(next instanceof owner.Node) && !external) return;
    if (
      next instanceof owner.Element &&
      next
        .closest('[data-dropdown-ancestors]')
        ?.getAttribute('data-dropdown-ancestors')
        ?.split(' ')
        .includes(id)
    )
      return;
    floating.events.onBlur(event);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const command = dropdownKeyboard.command(event, {
      trigger: anchorRef.current,
      panel: panelRef.current,
      open,
      blocked: Boolean(blocked),
      mode: keyboard,
    });
    if (!command) {
      if (closeOn?.escape !== false) floating.events.onKeyDown(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (command.action === 'focus') command.target.focus({ preventScroll: true });
    else if (command.action === 'open') {
      focusOnOpen.current = command.edge;
      changeOpen(true);
    }
  };
  const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
    const owner = event.currentTarget.ownerDocument.defaultView;
    if (
      keyboard === 'menu' &&
      owner &&
      event.target instanceof owner.Element &&
      event.target.closest('a[href]')
    )
      close();
  };
  return {
    scope: {
      ids: ownIds,
      external,
      portal,
      target: portalNode,
      ref: scopeRef,
      className,
      style,
      state,
    },
    root: {
      props: {
        ...rootProps,
        ref: setRootRef,
        collapse: collapse
          ? { ...collapseSettings, open: rootCollapse.open, onOpenChange: rootCollapse.changeOpen }
          : undefined,
        style,
        ...stateProps(state),
        onKeyDown: composeEventHandlers(onKeyDown, handleKeyDown, { cancelable: true }),
        onBlur: composeEventHandlers(onBlur, handleBlur, { cancelable: true }),
      },
      probe: { ref: probeRef, style: { width: `calc(${Math.abs(offset)} * var(--rpx))` } },
    },
    trigger: {
      element: trigger,
      props: {
        onClick: composeDropdownTriggerClick(trigger?.props.onClick, disabled, () => {
          focusOnOpen.current = null;
          changeOpen(!open);
        }),
        'aria-expanded': open,
        'aria-controls': trigger?.props['aria-controls'] ?? id,
      },
    },
    panel: {
      probe: external ? { ref: probeRef, style: { width: `calc(${Math.abs(offset)} * var(--rpx))` } } : undefined,
      props: {
        ...(external ? rootProps : {}),
        ...(external ? stateProps(state) : {}),
        ref: setPanelRef,
        id,
        tabIndex: rootProps.tabIndex ?? (initialFocus ? -1 : undefined),
        'data-dropdown-ancestors': ownIds.join(' '),
        style: {
          '--dropdown-offset': `calc(${offset} * var(--rpx))`,
          '--dropdown-viewport-padding': `${viewportPadding}px`,
          ...(external ? style : null),
          ...(portal ? floatingStyle : null),
        } as CSSProperties,
        'data-strategy': portal ? floating.strategy : undefined,
        'data-side': side,
        'data-open': open || undefined,
        'data-match-width': matchTriggerWidth || undefined,
        'aria-hidden': !open,
        inert: !open,
        onClick: composeEventHandlers(
          external ? rootProps.onClick : undefined,
          handlePanelClick,
        ),
        onBlur: external
          ? composeEventHandlers(onBlur, handleBlur, { cancelable: true })
          : undefined,
        onKeyDown: external
          ? composeEventHandlers(onKeyDown, handleKeyDown, { cancelable: true })
          : undefined,
      },
      open,
      portal,
      className: external ? className : undefined,
      openAnimate,
      present: presence.present,
      keepMounted,
      collapse: {
        ...panelCollapse,
        open,
        fade: panelCollapse?.fade ?? true,
        keepMounted,
        onTransition: (
          transition: Parameters<NonNullable<CollapseSettings['onTransition']>>[0],
        ) => {
          updatePosition();
          panelCollapse?.onTransition?.(transition);
        },
      },
      surface: {
        ...panelProps,
        ref: setSurfaceRef,
        onPointerDownCapture: composeEventHandlers(panelProps.onPointerDownCapture, dismissProps.onPointerDownCapture),
        onMouseDownCapture: composeEventHandlers(
          panelProps.onMouseDownCapture,
          composeEventHandlers(
            dismissProps.onMouseDownCapture,
            preserveFocus ? keepFocus : undefined,
          ),
        ),
        animate: isOpenAnimate(panelAnimate) ? undefined : panelAnimate,
        style: { ...motionStyle, ...panelProps.style },
        ...revealAttrs,
        hidden: openAnimate ? !presence.present : panelProps.hidden,
      },
    },
    children: typeof children === 'function' ? children(() => close()) : children,
    backdrop,
  };
}
