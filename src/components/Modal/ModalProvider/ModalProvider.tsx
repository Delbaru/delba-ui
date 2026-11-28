'use client';

import type { ReactNode } from 'react';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { DeclarationSlot } from '../DeclarationSlot/DeclarationSlot';
import { ModalContext, ModalDeclarationsContext, ModalRuntimeContext, useModalStack } from './ModalProvider.model';
import type { ModalProviderProps } from './ModalProvider.types';

/** Internal portal: rendering stays in the declaration's React subtree and retains all its contexts. */
export function ModalDeclarationPortal({ id, children }: { id: string; children: ReactNode }) {
  const entry = useContext(ModalDeclarationsContext).get(id);
  if (!entry?.target) return null;
  return createPortal(
    <ModalRuntimeContext.Provider value={entry.runtime}>{children}</ModalRuntimeContext.Provider>,
    entry.target,
  );
}

export function ModalProvider({ children }: ModalProviderProps) {
  const modal = useModalStack();
  const portal = modal.stack.length > 0 && typeof document !== 'undefined'
    ? createPortal(modal.stack.map(item => {
        if (item.declarative) {
          return <DeclarationSlot key={item.id} id={item.id} attach={modal.attach} />;
        }

        return (
          <ModalRuntimeContext.Provider key={item.id} value={modal.runtime(item)}>
            {item.node}
          </ModalRuntimeContext.Provider>
        );
      }), document.body)
    : null;

  return (
    <ModalContext.Provider value={modal.value}>
      <ModalDeclarationsContext.Provider value={modal.declarations}>
        {children}
        {portal}
      </ModalDeclarationsContext.Provider>
    </ModalContext.Provider>
  );
}
