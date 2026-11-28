'use client';

import { ElementFrame } from '#core/Element';
import { MotionLayers } from '#core/Motion';
import type { WithRef } from '#core';
import { useButton } from './Button.model';
import type { ButtonProps } from './Button.types';

export function Button(props: WithRef<ButtonProps, HTMLElement>) {
  const { host: Host, root, collapse, popup, effects, children } = useButton(props);

  return (
    <ElementFrame collapse={collapse} popup={popup}>
      <Host {...root}>
        <MotionLayers effects={effects} />
        {children}
      </Host>
    </ElementFrame>
  );
}
