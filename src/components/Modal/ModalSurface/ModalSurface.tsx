'use client';

import type { WithRef } from '#core';
import { Flex } from '../../Flex';
import type { ModalSurfaceProps } from '../Modal.types';
import { useModalSurface } from './ModalSurface.model';

export function ModalSurface(props: WithRef<ModalSurfaceProps, HTMLDivElement>) {
  const modal = useModalSurface(props);

  return (
    <Flex {...modal.root}>
      <Flex {...modal.overlay} />
      <Flex {...modal.dialog}>
        {modal.controls}
        <Flex display={['block', 'block', 'block']} {...modal.scroll}>
          {typeof modal.children === 'function' ? modal.children(modal.close) : modal.children}
        </Flex>
      </Flex>
    </Flex>
  );
}
