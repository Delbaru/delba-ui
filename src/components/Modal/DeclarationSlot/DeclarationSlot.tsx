'use client';

import { useCallback } from 'react';

import { Flex } from '../../Flex';
import styles from './DeclarationSlot.module.scss';

export function DeclarationSlot({
  id,
  attach,
}: {
  id: string;
  attach: (id: string, node: HTMLElement | null) => void;
}) {
  const ref = useCallback((node: HTMLDivElement | null) => attach(id, node), [attach, id]);
  return <Flex ref={ref} className={styles.DeclarationSlot} />;
}
