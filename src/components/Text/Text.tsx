'use client';
'use no memo';

import type { WithRef } from '#core';
import { ElementFrame } from '#core/Element';
import { MotionLayers } from '#core/Motion';
import { CounterValue } from './animations/counter/Counter';
import { bindTextContent } from './nonBreaking';
import { useText } from './Text.model';
import type { TextProps } from './Text.types';

export type { TextProps } from './Text.types';

export function Text(props: WithRef<TextProps, HTMLElement>) {
  const {
    host: Host, root, collapse, popup, effects, visible,
    content, nativeText, timelineCounter, Inner, animationOptions,
  } = useText(props);
  if (!visible && !collapse) return null;

  return (
    <ElementFrame collapse={collapse} popup={visible ? popup : undefined}>
      {visible && (nativeText !== undefined ? (
        <Host {...root}>{nativeText}</Host>
      ) : (
        <Host {...root}>
          {effects.glow && <MotionLayers effects={effects} />}
          {timelineCounter ? (
            <CounterValue {...timelineCounter} currentText={timelineCounter.finalText} />
          ) : Inner ? (
            <Inner content={content} options={animationOptions} />
          ) : bindTextContent(content)}
        </Host>
      ))}
    </ElementFrame>
  );
}
