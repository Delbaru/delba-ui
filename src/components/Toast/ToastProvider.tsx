'use client';

import { createContext, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../core';
import { Flex } from '../Flex';
import { ToastCard } from './ToastCard/ToastCard';
import { useToastQueue } from './Toast.model';
import { toastChannel } from './Toast.channel';
import type { ToastApi, ToastProviderProps } from './Toast.types';
import styles from './ToastProvider.module.scss';

export type { ToastOptions, ToastTone } from './Toast.types';
const ToastContext = createContext<ToastApi | null>(null);

/** Provider-scoped notification queue; its portal is created after client mount. */
export function ToastProvider({ children, className, renderToast }: ToastProviderProps) {
  const queue = useToastQueue();

  useEffect(() => toastChannel.register(document, queue.api), [queue.api]);

  return (
    <ToastContext.Provider value={queue.api}>
      {children}
      {queue.host && queue.items.length > 0 && createPortal(
        <Flex
            className={cx('ToastProvider', styles.ToastProvider, className)}
            dir={['column', 'column', 'column']}
            align={['center', 'center', 'center']}
            role='status'
            aria-live='polite'
        >
          {queue.items.map(item => <ToastCard
              key={item.id}
              item={item}
              onDismiss={() => queue.close(item.id)}
              onExited={() => queue.remove(item.id)}
              renderToast={renderToast}
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
