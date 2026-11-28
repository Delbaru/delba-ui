'use client';

import { cx } from '#core';
import { useOpenPresence } from '../../../hooks/useOpenPresence';
import { Flex } from '../../Flex';
import { DROPDOWN_DEFAULTS } from '../Dropdown.config';
import type { DropdownBackdropOptions } from '../Dropdown.types';
import styles from './DropdownBackdrop.module.scss';

/** Decorative outside-dismiss target in the same layer as its dropdown panel. */
export function DropdownBackdrop({
  open,
  animate = DROPDOWN_DEFAULTS.backdrop,
  className,
  style,
  ...props
}: DropdownBackdropOptions & { open: boolean }) {
  const presence = useOpenPresence(open);
  if (!presence.present) return null;
  return (
    <Flex
        display={['block', 'block', 'block']}
        {...props}
        ref={presence.ref}
        className={cx(styles.DropdownBackdrop, className)}
        style={style}
        animate={animate}
        ui={{ motion: { open } }}
        data-open={open || undefined}
        aria-hidden="true"
        inert={!open}
    />
  );
}
