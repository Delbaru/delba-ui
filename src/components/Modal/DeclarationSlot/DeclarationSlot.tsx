'use client';

import { useCallback } from 'react';

import { Flex } from '../../Flex';
import { cx } from '../../../core';
import styles from './DeclarationSlot.module.scss';

export function DeclarationSlot({
  id,
  attach,
  className,
}: {
  id: string;
  attach: (id: string, node: HTMLElement | null) => void;
  className?: string;
}) {
  const ref = useCallback((node: HTMLDivElement | null) => attach(id, node), [attach, id]);
  return <Flex ref={ref} className={cx(styles.DeclarationSlot, className)} />;
}
