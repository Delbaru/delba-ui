'use client';

import type { ReactNode } from 'react';
import { cx, type WithRef } from '../../../core';
import { Tooltip } from '../../Tooltip';
import type { TooltipBubbleProps } from '../../../hooks/useTooltip';
import styles from './ButtonTooltip.module.scss';

interface ButtonTooltipProps { id: string; bubble: TooltipBubbleProps; children: ReactNode }

/** Button-specific skin; shared Tooltip owns the portal and transition surface. */
export function ButtonTooltip({ ref, id, bubble, children }: WithRef<ButtonTooltipProps, HTMLElement>) {
  return (
    <Tooltip
        ref={ref}
        as="span"
        surface={false}
        id={id}
        className={cx('ButtonTooltip', styles.ButtonTooltip, 'ui-button-tooltip')}
        {...bubble}
    >
      {children}
    </Tooltip>
  );
}
