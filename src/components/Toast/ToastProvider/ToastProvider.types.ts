import type { ReactNode } from 'react';
import type { ToastOptions } from '../Toast.types';

export interface ToastProviderProps {
  /** Application content sharing this notification queue. */
  children: ReactNode;
  /** Project viewport marker/placement. The provider retains queue and portal ownership. */
  className?: string;
  /** Project card body; the library retains enter/exit, limits and timer cleanup. */
  renderToast?: (options: ToastOptions, dismiss: () => void) => ReactNode;
}
