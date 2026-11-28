import type { ReactNode } from 'react';
import type { TooltipBubbleProps } from '../../hooks/useTooltip';

export interface TooltipProps extends TooltipBubbleProps {
  /** Inline host for tooltip bubbles rendered by inline controls. Default div. */
  as?: 'div' | 'span';
  children: ReactNode;
  className?: string;
  /** id всплывашки для связи с триггером через aria-describedby. */
  id?: string;
  /** Встроенная тёмная плашка. Выключается, если контент рисует свою поверхность. */
  surface?: boolean;
}
