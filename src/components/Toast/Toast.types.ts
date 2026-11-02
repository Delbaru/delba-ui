import type { ReactNode } from 'react';

/** Visual status of a completed action. */
export type ToastTone = 'success' | 'warning' | 'error';

export interface ToastOptions {
  /** Short result of the action. */
  title: string;
  /** Optional detail below the title. */
  description?: string;
  /** Status icon and color; defaults to success. */
  tone?: ToastTone;
  /** Milliseconds before closing begins; defaults to 4000. */
  durationMs?: number;
}

export interface ToastProviderProps {
  /** Application content sharing this notification queue. */
  children: ReactNode;
}

export type ToastItem = ToastOptions & { id: string; open: boolean };
export type ToastApi = { show: (options: ToastOptions) => void };
