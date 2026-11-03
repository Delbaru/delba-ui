'use client';

import { useCallback } from 'react';

import styles from './InputOverflow.module.scss';
import { useTextOverflow } from '../../../hooks/useTextOverflow';
import { useTooltip } from '../../../hooks/useTooltip';
import { Tooltip } from '../../Tooltip';

export function InputOverflow({ tooltip }: { tooltip: ReturnType<typeof useInputOverflow> }) {
  if (!tooltip.isOverflowing) return null;

  return (
    <Tooltip ref={tooltip.tooltipRef} {...tooltip.bubbleProps} className={styles.InputOverflow}>
      {tooltip.text}
    </Tooltip>
  );
}

/** Connects the shared measurement and tooltip lifecycle to the field's input and row. */
export function useInputOverflow(options: { enabled: boolean; active: boolean }) {
  const overflow = useTextOverflow<HTMLInputElement>();
  const tooltip = useTooltip<HTMLElement, HTMLDivElement>({
    enabled: options.enabled && overflow.isOverflowing && !options.active,
    direction: 'bottom',
    align: 'center',
    gap: 8,
  });
  const setAnchorRef = useCallback(
    (node: HTMLElement | null) => {
      tooltip.anchorRef.current = node;
    },
    [tooltip.anchorRef],
  );

  return {
    setInputRef: overflow.setNode,
    setAnchorRef,
    text: overflow.text,
    isOverflowing: overflow.isOverflowing,
    show: tooltip.show,
    hide: tooltip.hide,
    tooltipRef: tooltip.tooltipRef,
    bubbleProps: tooltip.bubbleProps,
  };
}
