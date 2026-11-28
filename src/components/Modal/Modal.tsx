'use client';

import { cloneElement } from 'react';
import type { WithRef } from '#core';
import { useScrollbarActivity } from '../ScrollArea/ScrollbarActivity';
import { useDeclarativeModal } from './Modal.model';
import { ModalDeclarationPortal } from './ModalProvider';
import { ModalSurface } from './ModalSurface/ModalSurface';
import type { ModalProps } from './Modal.types';

function DeclarativeModal(props: WithRef<ModalProps, HTMLDivElement>) {
  const modal = useDeclarativeModal(props);

  return (
    <>
      <ModalDeclarationPortal id={modal.id}>
        <ModalSurface {...modal.surface} />
      </ModalDeclarationPortal>
      {modal.trigger && cloneElement(modal.trigger, modal.triggerProps)}
    </>
  );
}

export function Modal(props: WithRef<ModalProps, HTMLDivElement>) {
  useScrollbarActivity();
  if (props.trigger || props.open !== undefined || props.defaultOpen !== undefined)
    return <DeclarativeModal {...props} />;
  const {
    trigger: _trigger,
    open: _open,
    defaultOpen: _defaultOpen,
    onOpenChange: _onOpenChange,
    ...surface
  } = props;
  return <ModalSurface {...surface} />;
}
