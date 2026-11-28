import type { ReactNode } from 'react';

export interface ModalProviderProps {
  children: ReactNode;
}

export type PresentModalOptions = {
  onClose?: () => void;
  stackBehavior?: 'stack' | 'replace';
};
