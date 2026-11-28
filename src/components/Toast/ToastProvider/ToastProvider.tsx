'use client';

import { createPortal } from 'react-dom';
import { cx } from '#core';
import { Flex } from '../../Flex';
import { ToastCard } from '../ToastCard/ToastCard';
import { ToastContext, useToastQueue } from './ToastProvider.model';
import type { ToastProviderProps } from './ToastProvider.types';
import { TOAST_VIEWPORT } from './ToastProvider.config';
import styles from './ToastProvider.module.scss';

/** Provider-scoped notification queue; its portal is created after client mount. */
export function ToastProvider({ children, className, renderToast }: ToastProviderProps) {
  const queue = useToastQueue();

  return (
    <ToastContext.Provider value={queue.api}>
      {children}
      {queue.host && queue.items.length > 0 && createPortal(
        <Flex
            className={cx(styles.ToastProvider, className)}
            dir={TOAST_VIEWPORT.direction}
            align={TOAST_VIEWPORT.align}
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
