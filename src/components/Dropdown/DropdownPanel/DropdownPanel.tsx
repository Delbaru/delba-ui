'use client';

import type { ReactNode } from 'react';
import { cx } from '#core';
import { Flex } from '../../Flex';
import { CollapseWrap } from '../../Collapse/CollapseWrap';
import type { useDropdown } from '../Dropdown.model';
import { DropdownBackdrop } from '../DropdownBackdrop/DropdownBackdrop';
import type { DropdownBackdropOptions } from '../Dropdown.types';
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
    <Flex display={['block', 'block', 'block']} {...model.surface} className={cx(styles.surface, model.surface.className)}>{children}</Flex>
  );

  return (
    <>
      {backdrop && <DropdownBackdrop {...backdrop} open={model.open} />}
      <Flex
          display={['block', 'block', 'block']}
          {...model.props}
          className={cx(styles.DropdownPanel, model.portal && styles.portalPanel, model.className)}
      >
        {model.probe && <Flex display={['block', 'block', 'block']} {...model.probe} className={styles.gapProbe} aria-hidden />}
      {model.openAnimate ? (
          (model.present || model.keepMounted) && surface
        ) : (
          <CollapseWrap {...model.collapse} horizontalContent>{surface}</CollapseWrap>
        )}
      </Flex>
    </>
  );
}
