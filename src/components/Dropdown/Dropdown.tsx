'use client';

import { useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

import styles from './Dropdown.module.scss';

import { cx } from '../../core';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';
import { Flex, type FlexProps } from '../Flex';

export interface DropdownTriggerProps {
  onClick: () => void;
  'aria-expanded': boolean;
  'aria-controls': string;
}

export interface DropdownProps extends Omit<FlexProps, 'children'> {
  /** Кнопка-триггер: пропсы раскрытия разложить на неё. */
  trigger: (props: DropdownTriggerProps) => ReactNode;
  /** Содержимое панели; функция получает `close`. Клик по ссылке внутри закрывает сам. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Край триггера, к которому прижата панель. */
  side?: 'start' | 'center' | 'end';
  /** Зазор от триггера, дизайн-единицы. */
  offset?: number;
}

export function Dropdown({ trigger, children, side = 'start', offset = 8, className, style, ...panel }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = () => {
    if (rootRef.current?.contains(document.activeElement)) {
      rootRef.current.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(id)}"]`)?.focus();
    }
    setOpen(false);
  };

  useOutsideDismiss(rootRef, close, { enabled: open });

  const onPanelClick = (event: MouseEvent) => {
    if ((event.target as Element).closest('a[href]')) setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={styles.Dropdown}
      onBlur={(event) => event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
    >
      {trigger({ onClick: () => setOpen(!open), 'aria-expanded': open, 'aria-controls': id })}
      <Flex
        id={id}
        className={cx(styles.panel, className)}
        style={{ '--dropdown-offset': `calc(${offset} * var(--rpx))`, ...style } as CSSProperties}
        data-side={side}
        data-open={open || undefined}
        inert={!open}
        onClick={onPanelClick}
        {...panel}
      >
        {typeof children === 'function' ? children(close) : children}
      </Flex>
    </div>
  );
}
