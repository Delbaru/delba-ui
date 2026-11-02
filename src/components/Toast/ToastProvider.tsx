'use client';

import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../core';
import { Flex } from '../Flex';
import { ToastCard } from './ToastCard/ToastCard';
import { useToastQueue } from './Toast.model';
import type { ToastApi, ToastProviderProps } from './Toast.types';
import styles from './ToastProvider.module.scss';

export type { ToastOptions, ToastTone } from './Toast.types';
const ToastContext = createContext<ToastApi | null>(null);

/** Provider-scoped notification queue; its portal is created after client mount. */
export function ToastProvider({ children }: ToastProviderProps) {
  const queue = useToastQueue();

  return (
    <ToastContext.Provider value={queue.api}>
      {children}
      {queue.host && queue.items.length > 0 && createPortal(
        <Flex
            className={cx('ToastProvider', styles.ToastProvider)}
            dir={['column', 'column', 'column']}
            align={['center', 'center', 'center']}
            role='status'
            aria-live='polite'
        >
          {queue.items.map(item => <ToastCard
              key={item.id}
              item={item}
              onExited={() => queue.remove(item.id)}
          />)}
        </Flex>,
        queue.host,
      )}
    </ToastContext.Provider>
  );
}

/** Access this provider's notification commands. */
export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast вызван вне ToastProvider — он поднимается в корневом layout');
  return value;
}
