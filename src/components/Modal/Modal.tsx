'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useId,
  useLayoutEffect,
  cloneElement,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type MouseEventHandler,
} from 'react';
import styles from './Modal.module.scss';
import { boxLayout, composeEventHandlers, createLayoutClasses, cx, MEDIA_QUERY, MOTION_END_BUFFER_MS, prefersReducedMotion, readMotionMs, useMergedRefs, type BoxLayoutProps, type LayoutSpaceProps, type ResponsiveInput, type ResponsiveValue, type SpaceValue, type StateLinkInput, type WithRef } from '../../core';
import { Flex } from '../Flex';
import { scrollbarProps, type ScrollbarOptions } from '../ScrollArea/scrollbar';
import { ModalDeclarationPortal, useModalRegistry, useModalRuntime } from './ModalProvider';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useInteractionActivity } from '../../core/InteractionScope';
import { isOpenAnimate, type OpenAnimate } from '../../core/reveal/reveal';

type PresetKey = 'default' | 'fullWidth';

const c = createLayoutClasses(styles);
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalCloseOptions {
  /** Declarative dialogs close when this viewport breakpoint becomes active. */
  breakpoint?: 'desktop' | 'below' | 'mobile' | 'tablet';
  /** Close on an overlay click. Defaults to true. */
  overlay?: boolean;
  /** Close on Escape unless a nested control already consumed it. Defaults to true. */
  escape?: boolean;
}

export interface ModalScrollOptions extends LayoutSpaceProps {
  /** Native scrollbar appearance, shared with ScrollArea. Does not add a scroll container. */
  scrollbar?: ScrollbarOptions;
  /** Reserve the legacy scrollbar padding. Set false for a panel with its own padding. */
  gutter?: boolean;
}

export interface ModalTriggerProps {
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: 'dialog';
}

interface ModalSurfaceProps extends BoxLayoutProps, SharedMotionProps<OpenAnimate> {
  id?: string;
  children?: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
  rootClassName?: string;
  overlayClassName?: string;
  style?: CSSProperties;
  rootStyle?: CSSProperties;
  overlayStyle?: CSSProperties;

  /** Геометрия панели. Проектные наборы оформления задаются компонентом потребителя. */
  layout?: ResponsiveValue<PresetKey>;
  /** @deprecated Используйте layout; оставлен для существующих потребителей. */
  preset?: ResponsiveValue<PresetKey>;
  animation?: ResponsiveInput<'fadeInUp' | 'fadeInDown'>;

  closeOnOverlayClick?: boolean;
  /** Dismissal rules; grouped settings take precedence over the legacy overlay flag. */
  closeOn?: ModalCloseOptions;
  /** Padding of the sole scroll container inside the panel. */
  scroll?: ModalScrollOptions;

  /** Снять клип с панели для содержимого, которое должно выступать за её границы.
   *  Выпадающий список Select использует портал и этой настройки не требует. Платой — нет своей
   *  прокрутки: длинное содержимое тогда ограничивает и прокручивает вызывающий. */
  overflowVisible?: boolean;

  rootP?: LayoutSpaceProps['p'];
  rootPt?: ResponsiveValue<SpaceValue>;
  rootPr?: ResponsiveValue<SpaceValue>;
  rootPb?: ResponsiveValue<SpaceValue>;
  rootPl?: ResponsiveValue<SpaceValue>;
  rootM?: LayoutSpaceProps['m'];
  rootMt?: ResponsiveValue<SpaceValue>;
  rootMr?: ResponsiveValue<SpaceValue>;
  rootMb?: ResponsiveValue<SpaceValue>;
  rootMl?: ResponsiveValue<SpaceValue>;

  alignItems?: ResponsiveValue<
    'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline'
  >;
  justifyContent?: ResponsiveValue<
    'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly'
  >;

  color?: string;

  'aria-label'?: string;
  'aria-labelledby'?: string;
  'data-point-events'?: string;

  linkState?: StateLinkInput;
}

export type ModalProps = ModalSurfaceProps & {
  /** Declarative opener. Its click handler runs first and can cancel opening. */
  trigger?: ReactElement<ModalTriggerProps>;
} & (
  | {
      /** Controlled opening, owned by the caller. */
      open: boolean;
      /** Request to change the controlled opening. */
      onOpenChange: (open: boolean) => void;
      defaultOpen?: never;
    }
  | {
      open?: undefined;
      /** Initial opening in uncontrolled declarative mode. */
      defaultOpen?: boolean;
      /** Notification when uncontrolled opening changes. */
      onOpenChange?: (open: boolean) => void;
    }
);

function ModalSurface({
  ref,
  id,
  children,
  className = '',
  rootClassName,
  overlayClassName,
  style: panelStyle,
  rootStyle,
  overlayStyle,
  preset = ['default', 'default', 'default'],
  layout = preset,
  animation,
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
  const exitAfterRef = useRef(exitAfter);
  exitAfterRef.current = exitAfter;
  const closeOnEscape = closeOn?.escape ?? true;
  // Коробка делится на две: отступы root* и grow — у слоя-подложки, остальное — у панели диалога.
  const root = boxLayout(c, { p: rootP, pt: rootPt, pr: rootPr, pb: rootPb, pl: rootPl, m: rootM, mt: rootMt, mr: rootMr, mb: rootMb, ml: rootMl, grow });
  const panel = boxLayout(c, panelBox);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const hasFocusOrigin = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [entered, setEntered] = useState(false);
  const overlayPressed = useRef(false);
  // Свежий onClose без переподписки: провайдер отдаёт новую стрелку на каждом рендере.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, animate, open });
  const setPanelNode = useMergedRefs(panelRef, setMotionNode);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!closing || !panel) return;
    const overlay = panel.previousElementSibling;
    const duration = prefersReducedMotion() ? 0 : Math.max(
      readMotionMs(panel), readMotionMs(panel, 'animation'),
      overlay instanceof HTMLElement ? readMotionMs(overlay) : 0,
    );
    exitAfterRef.current(duration + MOTION_END_BUFFER_MS);
  }, [closing]);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(t);
    }
    const t = requestAnimationFrame(() => setEntered(false));
    return () => cancelAnimationFrame(t);
  }, [open]);

  // Escape, который погасил вложенный слой (список, календарь, выпадашка), окно не закрывает:
  // слой ставит preventDefault или останавливает всплытие, и сперва уходит он.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Escape' || e.defaultPrevented || !closeOnEscape) return;
      e.preventDefault();
      onClose();
    },
    [onClose, closeOnEscape]
  );

  useLayoutEffect(() => {
    if (!open || !active) return;
    if (!hasFocusOrigin.current) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      hasFocusOrigin.current = true;
    }
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus({ preventScroll: true });
  }, [open, active]);

  useLayoutEffect(() => {
    if (open || !hasFocusOrigin.current) return;
    const target = previousActiveElement.current;
    const activeDialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
      .filter((dialog) => !dialog.closest('[aria-hidden="true"], [inert]'));
    const targetDialog = target?.closest<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const canRestoreFocus = targetDialog
      ? activeDialogs.at(-1) === targetDialog
      : activeDialogs.length === 0;

    if (canRestoreFocus) target?.focus({ preventScroll: true });
    previousActiveElement.current = null;
    hasFocusOrigin.current = false;
  }, [open, active]);

  useEffect(() => () => {
    if (activeRef.current && hasFocusOrigin.current) previousActiveElement.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!open || !active) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Tab' && event.key !== 'Escape') return;
      const panel = panelRef.current;
      if (!panel || panel.closest('[aria-hidden="true"]')) return;
      // Портированные меню лежат рядом с панелью внутри корня активного модального слоя.
      const focusScope = panel.parentElement ?? panel;
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
        .filter((dialog) => !dialog.closest('[aria-hidden="true"]'));
      if (dialogs.at(-1) !== panel) return;

      // Фокус потерян (узел с ним исчез, клик в пустое место) — Escape до панели не дойдёт,
      // поэтому верхнее окно ловит его здесь. Фокус внутри — им занят обработчик панели.
      if (event.key === 'Escape') {
        if (closeOnEscape && !event.defaultPrevented && !focusScope.contains(document.activeElement)) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      const stops = Array.from(focusScope.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((node) => node.tabIndex >= 0 && node.getClientRects().length > 0 && !node.closest('[hidden], [inert], [aria-hidden="true"]'));
      const first = stops[0];
      const last = stops.at(-1);
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const active = document.activeElement;
      if (!stops.includes(active as HTMLElement) || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, open, closeOnEscape]);

  const handleOverlayClick = () => {
    const pressed = overlayPressed.current;
    overlayPressed.current = false;
    if (pressed && (closeOn?.overlay ?? closeOnOverlayClick)) onClose();
  };

  return (
    <Flex
        ref={ref}
        linkState={linkState}
        data-point-events={dataPointEvents}
        className={cx(styles.Modal, rootClassName, ...c.value('animation', animation), ...root)}
        data-open={open}
        data-entered={entered}
        data-closing={closing}
        data-open-motion={isOpenAnimate(animate) || undefined}
        role="presentation"
        aria-hidden={!open || !active}
        inert={!open || !active}
        align={alignItems ?? ['center', 'center', 'center']}
        justify={justifyContent ?? ['center', 'center', 'center']}
        style={rootStyle}
    >
      <div
          className={cx(styles.Overlay, overlayClassName)}
          style={overlayStyle}
          onMouseDown={() => { overlayPressed.current = true; }}
          onClick={handleOverlayClick}
          role="presentation"
      />
      <div
        id={id}
        ref={setPanelNode}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        tabIndex={-1}
        className={cx(
          styles.Panel,
          overflowVisible && styles.overflowVisible,
          ...c.value('preset', layout),
          ...panel,
          ...c.value('color', color),
          className
        )}
        style={{
          ...(motionStyle ?? null),
          ...panelStyle,
        }}
        {...revealAttrs}
        {...motionHandlers}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div
            {...scrollbarProps({ width: 4, color: 'var(--primary)', inset: 8, gutter: 'auto', ...scroll?.scrollbar })}
            className={cx('ui-scrollbar', styles.inner, overflowVisible && styles.innerOverflowVisible, scroll?.gutter === false && styles.noGutter, ...boxLayout(c, scroll ?? {}))}
        >
          {typeof children === 'function' ? children(onClose) : children}
        </div>
      </div>
    </Flex>
  );
}

function DeclarativeModal({ ref, trigger, open: controlledOpen, defaultOpen = false, onOpenChange, ...props }: WithRef<ModalProps, HTMLDivElement>) {
  const registry = useModalRegistry();
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const requestedOpen = controlledOpen ?? internalOpen;
  const breakpointMatches = useMediaQuery(props.closeOn?.breakpoint ? MEDIA_QUERY[props.closeOn.breakpoint] : 'not all');
  const open = requestedOpen && !breakpointMatches;
  useInteractionActivity(open);
  const changeOpenRef = useRef<(next: boolean) => void>(() => {});
  changeOpenRef.current = (next) => {
    if (requestedOpen === next) return;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const close = useCallback(() => changeOpenRef.current(false), []);

  useLayoutEffect(() => {
    registry.sync(id, open, close);
  });
  useLayoutEffect(() => () => registry.remove(id), [registry, id]);
  useEffect(() => {
    if (breakpointMatches) changeOpenRef.current(false);
  }, [breakpointMatches]);

  const disabled = trigger?.props.disabled || trigger?.props['aria-disabled'] === true || trigger?.props['aria-disabled'] === 'true';
  return <>
    <ModalDeclarationPortal id={id}><ModalSurface {...props} id={id} ref={ref} /></ModalDeclarationPortal>
    {trigger && cloneElement(trigger, {
    onClick: composeEventHandlers(trigger.props.onClick, () => {
      if (!disabled && !breakpointMatches) changeOpenRef.current(true);
    }, { cancelable: true }),
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    })}
  </>;
}

export function Modal(props: WithRef<ModalProps, HTMLDivElement>) {
  if (props.trigger || props.open !== undefined || props.defaultOpen !== undefined) return <DeclarativeModal
      {...props}
  />;
  const { trigger: _trigger, open: _open, defaultOpen: _defaultOpen, onOpenChange: _onOpenChange, ...surface } = props;
  return <ModalSurface {...surface} />;
}
