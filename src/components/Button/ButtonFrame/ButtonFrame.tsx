'use client';

import type { ReactNode } from 'react';
import { CollapseWrap } from '../../Collapse/CollapseWrap';
import type { ButtonProps } from '../Button.types';
import styles from './ButtonFrame.module.scss';

/** Keep the host at a stable position when a tooltip or popup changes. */
export function ButtonFrame({ collapse, children }: {
  collapse: ButtonProps['collapse'];
  children: ReactNode;
}) {
  if (!collapse) return <>{children}</>;
  return <CollapseWrap {...collapse} as="span" inline className={styles.ButtonFrame}>{children}</CollapseWrap>;
}
