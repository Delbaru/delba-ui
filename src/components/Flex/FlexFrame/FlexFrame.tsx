'use client';

import type { ReactNode, RefObject } from 'react';
import { cx } from '../../../core';
import { InteractionScope } from '../../../core/InteractionScope';
import { CollapseWrap, type CollapseWrapProps } from '../../Collapse/CollapseWrap';
import type { FlexProps } from '../Flex.types';
import styles from './FlexFrame.module.scss';

/** Keep the interaction provider around only the host, not its sibling popup.
 * Collapse retains ownership of the existing wrapper and motion lifecycle.
 */
export function FlexFrame({ target, track, onChange, hasPopup, popup, collapse, children }: {
  target: RefObject<HTMLElement | null>;
  track: boolean;
  onChange?: FlexProps['onInteractionChange'];
  hasPopup: boolean;
  popup: ReactNode;
  collapse?: Omit<CollapseWrapProps, 'children'>;
  children: (active: boolean) => ReactNode;
}) {
  const scoped = track ? (
    <InteractionScope target={target} onChange={onChange}>{children}</InteractionScope>
  ) : children(false);
  if (!collapse) return hasPopup ? <>{scoped}{popup}</> : scoped;
  return (
    <CollapseWrap {...collapse} className={cx(styles.FlexFrame, collapse.className)}>
      {scoped}{popup}
    </CollapseWrap>
  );
}
