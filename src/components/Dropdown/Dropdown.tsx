'use client';

import { cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { cx, stateProps, type WithRef } from '#core';
import { Flex } from '../Flex';
import { DropdownAncestors, useDropdown } from './Dropdown.model';
import { DropdownPanel } from './DropdownPanel/DropdownPanel';
import type { DropdownProps } from './Dropdown.types';
import styles from './Dropdown.module.scss';

export type {
  DropdownProps,
  DropdownTriggerProps,
  DropdownPanelOptions,
  DropdownChangeReason,
} from './Dropdown.types';

export function Dropdown(props: WithRef<DropdownProps, HTMLDivElement>) {
  const dropdown = useDropdown(props);
  const { scope } = dropdown;
  const panel = (
    <DropdownPanel model={dropdown.panel} backdrop={dropdown.backdrop}>
      {dropdown.children}
    </DropdownPanel>
  );

  if (scope.external) {
    if (scope.portal && !scope.target) return null;
    return (
      <DropdownAncestors.Provider value={scope.ids}>
        {scope.portal && scope.target ? createPortal(panel, scope.target) : panel}
      </DropdownAncestors.Provider>
    );
  }

  return (
    <DropdownAncestors.Provider value={scope.ids}>
      <Flex
          display={['inline-flex', 'inline-flex', 'inline-flex']}
          {...dropdown.root.props}
          data-ui-collapse-layout={undefined}
          className={cx(styles.Dropdown, scope.className)}
      >
        {dropdown.trigger.element && cloneElement(dropdown.trigger.element, dropdown.trigger.props)}
        <Flex display={['block', 'block', 'block']} {...dropdown.root.probe} className={styles.gapProbe} aria-hidden />
        {scope.portal && scope.target
          ? createPortal(
              <Flex
                  display={['contents', 'contents', 'contents']}
                  ref={scope.ref}
                  className={cx(styles.PortalRoot, scope.className)}
                  style={scope.style}
                  {...stateProps(scope.state)}
              >
                {panel}
              </Flex>,
              scope.target,
            )
          : panel}
      </Flex>
    </DropdownAncestors.Provider>
  );
}
