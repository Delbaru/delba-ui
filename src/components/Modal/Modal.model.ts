'use client';

import { useRef, useEffect, useCallback, useState, useId, useLayoutEffect } from 'react';
import { composeEventHandlers, MEDIA_QUERY, type WithRef } from '#core';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useInteractionActivity } from '../../core/InteractionScope';
import { useModalRegistry } from './ModalProvider';
import type { ModalProps, ModalTriggerProps } from './Modal.types';

export function useDeclarativeModal({
  ref,
  trigger,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  ...props
}: WithRef<ModalProps, HTMLDivElement>) {
  const registry = useModalRegistry();
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const requestedOpen = controlledOpen ?? internalOpen;
  const breakpointMatches = useMediaQuery(
    props.closeOn?.breakpoint ? MEDIA_QUERY[props.closeOn.breakpoint] : 'not all',
  );
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

  const disabled =
    trigger?.props.disabled ||
    trigger?.props['aria-disabled'] === true ||
    trigger?.props['aria-disabled'] === 'true';
  const triggerProps: ModalTriggerProps = {
    onClick: composeEventHandlers(
      trigger?.props.onClick,
      () => {
        if (!disabled && !breakpointMatches) changeOpenRef.current(true);
      },
      { cancelable: true },
    ),
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
  };

  return { id, trigger, triggerProps, surface: { ...props, id, ref } };
}
