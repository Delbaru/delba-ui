'use client';

import { useRef } from 'react';
import { boxLayout, createLayoutClasses, cx, useMergedRefs, type WithRef } from '../../../core';
import { Flex } from '../../Flex';
import { Box } from '../../Box';
import { scrollbarProps } from '../../ScrollArea/scrollbar';
import { useModalRuntime } from '../ModalProvider';
import { useSharedMotion } from '../../../hooks/useSharedMotion';
import { isOpenAnimate } from '../../../core/reveal/reveal';
import type { ModalSurfaceProps } from '../Modal.types';
import { useModalSurface } from './ModalSurface.model';
import styles from './ModalSurface.module.scss';

const c = createLayoutClasses(styles);

export function ModalSurface({
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
  const dialog = useModalSurface({
    panel: panelRef,
    open,
    active,
    closing,
    escape: closeOnEscape,
    close: onClose,
    exitAfter,
  });
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({
    perspective3d,
    parallax,
    animate,
    open,
  });
  const setPanelNode = useMergedRefs(panelRef, setMotionNode);

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
      className={cx(
        'ModalSurface',
        styles.ModalSurface,
        rootClassName,
        ...c.value('animation', animation),
        ...root,
      )}
      data-open={open}
      data-entered={dialog.entered}
      data-closing={closing}
      data-open-motion={isOpenAnimate(animate) || undefined}
      role="presentation"
      aria-hidden={!open || !active}
      inert={!open || !active}
      align={alignItems ?? ['center', 'center', 'center']}
      justify={justifyContent ?? ['center', 'center', 'center']}
      style={rootStyle}
    >
      <Flex
        className={cx(styles.Overlay, overlayClassName)}
        style={overlayStyle}
        onMouseDown={() => {
          overlayPressed.current = true;
        }}
        onClick={handleOverlayClick}
        role="presentation"
      />
      <Flex
        id={id}
        ref={setPanelNode}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        data-smooth-scroll-ignore
        tabIndex={-1}
        className={cx(
          styles.Panel,
          overflowVisible && styles.overflowVisible,
          ...c.value('preset', layout),
          ...panel,
          ...c.value('color', color),
          className,
        )}
        style={{
          ...(motionStyle ?? null),
          ...panelStyle,
        }}
        {...revealAttrs}
        {...motionHandlers}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={dialog.onKeyDown}
      >
        <Box
          {...scrollbarProps(scroll?.scrollbar)}
          className={cx(
            'ui-scrollbar',
            styles.inner,
            overflowVisible && styles.innerOverflowVisible,
            scroll?.gutter === false && styles.noGutter,
            ...boxLayout(c, scroll ?? {}),
          )}
        >
          {typeof children === 'function' ? children(onClose) : children}
        </Box>
      </Flex>
    </Flex>
  );
}
