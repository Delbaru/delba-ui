'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { boxLayout, createLayoutClasses, cx, MOTION_END_BUFFER_MS, prefersReducedMotion, readMotionMs, type WithRef } from '#core';
import { isOpenAnimate } from '../../../core/reveal/reveal';
import { useModalRuntime } from '../ModalProvider';
import { scrollbarProps } from '../../ScrollArea/scrollbar';
import { MODAL_DEFAULTS } from '../Modal.config';
import type { ModalSurfaceProps } from '../Modal.types';
import styles from './ModalSurface.module.scss';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const modalFocus = {
  dialogs(document: Document) {
    return [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter(
      (dialog) => !dialog.closest('[aria-hidden="true"], [inert]'),
    );
  },
  restore(target: HTMLElement | null) {
    if (!target) return;
    const active = modalFocus.dialogs(target.ownerDocument);
    const dialog = target.closest<HTMLElement>('[role="dialog"][aria-modal="true"]');
    if (dialog ? active.at(-1) === dialog : active.length === 0)
      target.focus({ preventScroll: true });
  },
  trap(event: globalThis.KeyboardEvent, panel: HTMLElement, escape: boolean, close: () => void) {
    if (!['Tab', 'Escape'].includes(event.key) || panel.closest('[aria-hidden="true"]')) return;
    if (modalFocus.dialogs(panel.ownerDocument).at(-1) !== panel) return;
    const scope = panel.parentElement ?? panel;
    const current = panel.ownerDocument.activeElement;
    if (event.key === 'Escape') {
      if (escape && !event.defaultPrevented && !scope.contains(current)) {
        event.preventDefault();
        close();
      }
      return;
    }
    const stops = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (node) =>
        node.tabIndex >= 0 &&
        node.getClientRects().length > 0 &&
        !node.closest('[hidden], [inert], [aria-hidden="true"]'),
    );
    const first = stops[0];
    const last = stops.at(-1);
    const withinStops = stops.some((node) => node === current);
    const atBoundary = event.shiftKey ? current === first : current === last;
    if (!first || !last || !withinStops || atBoundary) {
      event.preventDefault();
      (event.shiftKey ? (last ?? panel) : (first ?? panel)).focus();
    }
  },
};

interface ModalSurfaceState {
  panel: RefObject<HTMLElement | null>;
  open: boolean;
  active: boolean;
  closing: boolean;
  escape: boolean;
  close(): void;
  exitAfter(duration: number): void;
}

/** Owns dialog focus, confirmed-close restoration, and the visible transition lifecycle. */
function useDialogLifecycle({
  panel,
  open,
  active,
  closing,
  escape,
  close,
  exitAfter,
}: ModalSurfaceState) {
  const origin = useRef<HTMLElement | null>(null);
  const captured = useRef(false);
  const activeRef = useRef(active);
  const closeRef = useRef(close);
  const exitRef = useRef(exitAfter);
  activeRef.current = active;
  closeRef.current = close;
  exitRef.current = exitAfter;

  useLayoutEffect(() => {
    const node = panel.current;
    const document = node?.ownerDocument;
    const view = document?.defaultView;
    if (!open || !active || !node || !document || !view) return;
    if (!captured.current) {
      const current = document.activeElement;
      origin.current = current instanceof view.HTMLElement ? current : null;
      captured.current = true;
    }
    if (!node.contains(document.activeElement)) node.focus({ preventScroll: true });
    const trap = (event: globalThis.KeyboardEvent) =>
      modalFocus.trap(event, node, escape, () => closeRef.current());
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [active, escape, open, panel]);

  useLayoutEffect(() => {
    if (open || !captured.current) return;
    modalFocus.restore(origin.current);
    origin.current = null;
    captured.current = false;
  }, [open, active]);

  useEffect(
    () => () => {
      if (activeRef.current && captured.current) origin.current?.focus({ preventScroll: true });
    },
    [],
  );

  useLayoutEffect(() => {
    const node = panel.current;
    const view = node?.ownerDocument.defaultView;
    if (!closing || !node || !view) return;
    const overlay = node.previousElementSibling;
    const duration = prefersReducedMotion()
      ? 0
      : Math.max(
          readMotionMs(node),
          readMotionMs(node, 'animation'),
          overlay instanceof view.HTMLElement ? readMotionMs(overlay) : 0,
        );
    exitRef.current(duration + MOTION_END_BUFFER_MS);
  }, [closing, panel]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !escape) return;
      event.preventDefault();
      closeRef.current();
    },
    [escape],
  );

  return { onKeyDown };
}

const c = createLayoutClasses(styles);

export function useModalSurface({
  ref,
  id,
  children,
  controls,
  className = '',
  rootClassName,
  overlayClassName,
  style: panelStyle,
  rootStyle,
  overlayStyle,
  preset = MODAL_DEFAULTS.layout,
  layout = preset,
  closeOnOverlayClick = true,
  closeOn,
  scroll,
  overflowVisible = false,
  rootP,
  rootPt,
  rootPr,
  rootPb,
  rootPl,
  rootM,
  rootMt,
  rootMr,
  rootMb,
  rootMl,
  grow,
  perspective3d,
  parallax,
  animate,
  alignItems,
  justifyContent,
  color,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'data-point-events': dataPointEvents,
  linkState,
  ...panelBox
}: WithRef<ModalSurfaceProps, HTMLDivElement>) {
  const { open, active, closing, dismiss: onClose, exitAfter } = useModalRuntime();
  const closeOnEscape = closeOn?.escape ?? true;
  // Коробка делится на две: отступы root* и grow — у слоя-подложки, остальное — у панели диалога.
  const root = boxLayout(c, {
    p: rootP,
    pt: rootPt,
    pr: rootPr,
    pb: rootPb,
    pl: rootPl,
    m: rootM,
    mt: rootMt,
    mr: rootMr,
    mb: rootMb,
    ml: rootMl,
    grow,
  });
  const panel = boxLayout(c, panelBox);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayPressed = useRef(false);
  const dialog = useDialogLifecycle({
    panel: panelRef,
    open,
    active,
    closing,
    escape: closeOnEscape,
    close: onClose,
    exitAfter,
  });
  const handleOverlayClick = () => {
    const pressed = overlayPressed.current;
    overlayPressed.current = false;
    if (pressed && (closeOn?.overlay ?? closeOnOverlayClick)) onClose();
  };


  return {
    root: {
      ref,
      linkState,
      'data-point-events': dataPointEvents,
      className: cx(styles.ModalSurface, rootClassName, ...root),
      'data-open': open,
      'data-entered': open,
      'data-closing': closing,
      'data-open-motion': isOpenAnimate(animate?.appearance) || undefined,
      role: 'presentation' as const,
      'aria-hidden': !open || !active,
      inert: !open || !active,
      align: alignItems ?? MODAL_DEFAULTS.align,
      justify: justifyContent ?? MODAL_DEFAULTS.justify,
      style: rootStyle,
    },
    overlay: {
      className: cx(styles.Overlay, overlayClassName),
      style: overlayStyle,
      onMouseDown: () => { overlayPressed.current = true; },
      onClick: handleOverlayClick,
      role: 'presentation' as const,
    },
    dialog: {
      id,
      ref: panelRef,
      role: 'dialog' as const,
      'aria-modal': true,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'data-smooth-scroll-ignore': true,
      tabIndex: -1,
      className: cx(
        styles.Panel,
        Boolean(controls) && styles.withControls,
        overflowVisible && styles.overflowVisible,
        ...c.value('preset', layout),
        ...panel,
        ...c.value('color', color),
        className,
      ),
      style: panelStyle,
      animate,
      perspective3d,
      parallax,
      ui: { motion: { open } },
      onClick: (event: MouseEvent<HTMLElement>) => event.stopPropagation(),
      onKeyDown: dialog.onKeyDown,
    },
    scroll: {
      ...scrollbarProps(scroll?.scrollbar),
      className: cx(
        'ui-scrollbar',
        styles.inner,
        overflowVisible && styles.innerOverflowVisible,
        scroll?.gutter === false && styles.noGutter,
        ...boxLayout(c, scroll ?? {}),
      ),
    },
    controls,
    children,
    close: onClose,
  };
}
