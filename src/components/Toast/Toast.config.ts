import { assetUrl } from '../../core';
import checkIcon from '../../../assets/icons/ui/check/style-3/check.svg';
import exclamationIcon from '../../../assets/icons/ui/exclamation/style-1/exclamation.svg';
import crossIcon from '../../../assets/icons/ui/cross/style-7/cross.svg';
import type { ToastTone } from './Toast.types';

export const TOAST_DEFAULTS = { durationMs: 4000, maxVisible: 5 } as const;

export const TOAST_TONES: Record<ToastTone, { glyph: string; fill: string }> = {
  success: { glyph: assetUrl(checkIcon), fill: 'var(--success)' },
  warning: { glyph: assetUrl(exclamationIcon), fill: 'var(--warning)' },
  error: { glyph: assetUrl(crossIcon), fill: 'var(--error)' },
};
