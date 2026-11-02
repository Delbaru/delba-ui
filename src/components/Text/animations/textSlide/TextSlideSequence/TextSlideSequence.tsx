'use client';
'use no memo';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { cx } from '../../../../../core';
import { motionTimeCss } from '../../../../../core/base/timing';
import { Flex } from '../../../../Flex';
import type { TextSlideOptions } from '../types';

type SequenceOptions = TextSlideOptions & { steps: string[]; currentStep: number };

import styles from './TextSlideSequence.module.scss';

export function TextSlideSequence({ options }: { options: SequenceOptions }) {
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [cumHeights, setCumHeights] = useState<number[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const items = itemRefs.current.slice(0, options.steps.length);
    const view = items.find(Boolean)?.ownerDocument.defaultView;
    if (!view) return;

    const measure = () => {
      const heights = items.map((node) => node?.offsetHeight ?? 0);
      let total = 0;
      const cumulative = heights.map((height) => (total += height));
      setCumHeights((previous) => previous.length === cumulative.length && previous.every((height, index) => height === cumulative[index]) ? previous : cumulative);
      setContainerHeight(heights[options.currentStep] ?? 0);
    };

    const observer = new view.ResizeObserver(measure);
    items.forEach((node) => { if (node) observer.observe(node); });
    measure();
    return () => observer.disconnect();
  }, [options.steps, options.currentStep]);

  const translateY = cumHeights[options.currentStep - 1] || 0;
  // Измеренная высота — значение рантайма: класса утилиты под него нет, поэтому стилем.
  const stageStyle = {
    height: `${containerHeight}px`,
    transform: `translateY(-${translateY}px)`,
    '--slide-dur':
      options.duration !== undefined
        ? motionTimeCss(options.duration)
        : 'var(--t-m-text-slide-sequence-duration)',
  } as CSSProperties;

  return (
    <Flex
        className={cx('TextSlideSequence', styles.TextSlideSequence, 'ui-slide')}
        style={stageStyle}
    >
      {options.steps.map((step, index) => (
        <span
          key={index}
            aria-hidden={index !== options.currentStep || undefined}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          className={'ui-slide-item'}
          style={{ top: cumHeights[index - 1] || 0 }}
        >
          {step}
        </span>
      ))}
    </Flex>
  );
}
