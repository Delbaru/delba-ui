import { assetUrl } from '#core';
import checkIcon from '#icons/controls/check-outline.svg';
import exclamationIcon from '#icons/controls/exclamation.svg';
import closeIcon from '#icons/controls/close.svg';
import type { ToastTone } from './Toast.types';

export const TOAST_DEFAULTS = { durationMs: 4000, maxVisible: 5 } as const;

export const TOAST_TONES: Record<ToastTone, { glyph: string; fill: string }> = {
  success: { glyph: assetUrl(checkIcon), fill: 'var(--success)' },
  warning: { glyph: assetUrl(exclamationIcon), fill: 'var(--warning)' },
  error: { glyph: assetUrl(closeIcon), fill: 'var(--error)' },
  info: { glyph: assetUrl(exclamationIcon), fill: 'var(--primary)' },
};
