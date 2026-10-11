'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import styles from './Modal.module.scss';
import { boxLayout, createLayoutClasses, cx, useMergedRefs, type GrowProps, type LayoutSpaceProps, type RadiusPropsShort, type ResponsiveInput, type ResponsiveValue, type SizePropsShort, type SpaceValue, type StateLinkInput, type WithRef } from '../../core';
import { Flex } from '../Flex';
import { useModalRuntime } from './ModalProvider';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';

type PresetKey = 'default' | 'fullWidth';

const c = createLayoutClasses(styles);
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalSurfaceProps extends LayoutSpaceProps, RadiusPropsShort, SizePropsShort, GrowProps, SharedMotionProps {
  id?: string;
  open: boolean;
  active: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
  rootClassName?: string;
  overlayClassName?: string;
  style?: CSSProperties;
  rootStyle?: CSSProperties;
  overlayStyle?: CSSProperties;

  preset?: ResponsiveValue<PresetKey>;
  animation?: ResponsiveInput<'fadeInUp' | 'fadeInDown'>;

  closeOnOverlayClick?: boolean;

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

  bg?: string;
  color?: string;

  'aria-label'?: string;
  'aria-labelledby'?: string;
  'data-point-events'?: string;

  linkState?: StateLinkInput;
}

export type ModalProps = Omit<ModalSurfaceProps, 'open' | 'active' | 'onClose'>;

function ModalSurface({
  ref,
  id,
  open,
  active,
  onClose,
  children,
  className = '',
  rootClassName,
  overlayClassName,
  style: panelStyle,
  rootStyle,
  overlayStyle,
  preset = ['default', 'default', 'default'],
  animation,
  closeOnOverlayClick = true,
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
  alignItems,
  justifyContent,
  color,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'data-point-events': dataPointEvents,
  linkState,
  ...panelBox
}: WithRef<ModalSurfaceProps, HTMLDivElement>) {
  // Коробка делится на две: отступы root* и grow — у слоя-подложки, остальное — у панели диалога.
  const root = boxLayout(c, { p: rootP, pt: rootPt, pr: rootPr, pb: rootPb, pl: rootPl, m: rootM, mt: rootMt, mr: rootMr, mb: rootMb, ml: rootMl, grow });
  const panel = boxLayout(c, panelBox);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const hasFocusOrigin = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [entered, setEntered] = useState(false);
  // Свежий onClose без переподписки: провайдер отдаёт новую стрелку на каждом рендере.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { motionHandlers, motionStyle, setMotionNode } = useSharedMotion({ perspective3d, parallax });
  const setPanelNode = useMergedRefs(panelRef, setMotionNode);

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
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open || !active) return;
    if (!hasFocusOrigin.current) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      hasFocusOrigin.current = true;
    }
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
  }, [open, active]);

  useEffect(() => {
    if (open || !hasFocusOrigin.current) return;
    const target = previousActiveElement.current;
    const activeDialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
      .filter((dialog) => !dialog.closest('[aria-hidden="true"], [inert]'));
    const targetDialog = target?.closest<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const canRestoreFocus = targetDialog
      ? activeDialogs.at(-1) === targetDialog
      : activeDialogs.length === 0;

    if (canRestoreFocus) target?.focus();
    previousActiveElement.current = null;
    hasFocusOrigin.current = false;
  }, [open, active]);

  useEffect(() => () => {
    if (activeRef.current && hasFocusOrigin.current) previousActiveElement.current?.focus();
  }, []);

  useEffect(() => {
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
        if (!event.defaultPrevented && !focusScope.contains(document.activeElement)) {
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
  }, [active, open]);

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose();
  };

  return (
    <Flex
      ref={ref}
      linkState={linkState}
      data-point-events={dataPointEvents}
      className={cx(styles.Modal, rootClassName, ...c.value('animation', animation), ...root)}
      data-open={open}
      data-entered={entered}
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
          ...c.value('preset', preset),
          ...panel,
          ...c.value('color', color),
          className
        )}
        style={{
          ...(motionStyle ?? null),
          ...panelStyle,
        }}
        {...motionHandlers}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={cx(styles.inner, overflowVisible && styles.innerOverflowVisible)}>{children}</div>
      </div>
    </Flex>
  );
}

export function Modal({ ref, ...props }: WithRef<ModalProps, HTMLDivElement>) {
  const { open, active, dismiss } = useModalRuntime();

  return <ModalSurface {...props} ref={ref} open={open} active={active} onClose={dismiss} />;
}
