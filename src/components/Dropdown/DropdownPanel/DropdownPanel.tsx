'use client';

import type { ReactNode } from 'react';
import { cx } from '../../../core';
import { Box } from '../../Box';
import { CollapseWrap } from '../../Collapse/CollapseWrap';
import type { useDropdown } from '../Dropdown.model';
import {
  DropdownBackdrop,
  type DropdownBackdropOptions,
} from '../DropdownBackdrop/DropdownBackdrop';
import styles from './DropdownPanel.module.scss';

type PanelModel = ReturnType<typeof useDropdown>['panel'];

export function DropdownPanel({
  model,
  backdrop,
  children,
}: {
  model: PanelModel;
  backdrop?: DropdownBackdropOptions;
  children: ReactNode;
}) {
  const surface = (
    <Box {...model.surface} className={cx(styles.surface, model.surface.className)}>{children}</Box>
  );

  return (
    <>
      {backdrop && <DropdownBackdrop {...backdrop} open={model.open} />}
      <Box
        {...model.props}
        className={cx(
          'DropdownPanel',
          styles.DropdownPanel,
          model.portal && styles.portalPanel,
          model.className,
        )}
      >
        {model.probe && <Box {...model.probe} className={styles.gapProbe} aria-hidden />}
      {model.openAnimate ? (
          (model.present || model.keepMounted) && surface
        ) : (
          <CollapseWrap {...model.collapse}>{surface}</CollapseWrap>
        )}
      </Box>
    </>
  );
}
