'use client';
'use no memo';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { Flex } from '../../../Flex';
import type { TextAnimationContext } from '../types';
import type { TextClipOptions } from './types';
import { useMotionTime } from '../../../../hooks/useMotionTime';
import { prefersReducedMotion } from '../../../../core/base/motion';

/**
 * Клип-смена шага: текущий шаг «срезается» сверху clip-path'ом, подменяется на новый и «открывается»
 * снизу. Высота сцены держится по самому высокому шагу (измеряется), шаги наложены через absolute.
 * Сцена — Flex (высота пропом); position/overflow/transition — в scss на токенах, длительность — CSS-var.
 */
export function TextClip({ options }: TextAnimationContext<TextClipOptions>) {
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [heights, setHeights] = useState<number[]>([]);
  const [displayedStep, setDisplayedStep] = useState(options?.currentStep ?? 0);
  const [clipPath, setClipPath] = useState('inset(0 0 0 0)');
  const stageRef = useRef<HTMLElement | null>(null);
  const durationMs = useMotionTime('textClip', 'duration', stageRef, options?.duration);
  const requestedStep = options?.currentStep;
  const displayedRef = useRef(displayedStep);
  displayedRef.current = displayedStep;

  useEffect(() => {
    if (itemRefs.current.length === 0) return;
    setHeights(itemRefs.current.map((el) => el?.offsetHeight || 0));
  }, [options?.steps]);

  useEffect(() => {
    if (requestedStep === undefined) return;
    if (requestedStep === displayedRef.current || durationMs === 0 || prefersReducedMotion()) {
      setDisplayedStep(requestedStep);
      setClipPath('inset(0 0 0 0)');
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (callback: () => void, delay: number) => { timers.push(setTimeout(callback, delay)); };
    later(() => {
      setClipPath('inset(0 0 100% 0)');
      later(() => {
        setDisplayedStep(requestedStep);
        setClipPath('inset(100% 0 0 0)');
        later(() => {
          setClipPath('inset(0 0 0 0)');
        }, 0);
      }, durationMs);
    }, 0);

    return () => timers.forEach(clearTimeout);
  }, [requestedStep, durationMs]);

  if (!options) return null;

  const maxHeight = heights.length > 0 ? Math.max(...heights) : 0;
  // Измеренная высота — значение рантайма: класса утилиты под него нет, поэтому стилем.
  const stageStyle = {
    height: maxHeight ? `${maxHeight}px` : options.clipHeight ?? 'auto',
    clipPath,
    '--clip-dur': `${durationMs}ms`,
  } as CSSProperties;

  return (
    <Flex ref={stageRef} className={'ui-clip'} style={stageStyle}>
      {options.steps.map((step, index) => (
        <span
            key={step.slice(0, 60)}
            ref={(el) => { itemRefs.current[index] = el; }}
            className={'ui-clip-item'}
            style={{ opacity: index === displayedStep ? 1 : 0 }}
        >
          {step}
        </span>
      ))}
    </Flex>
  );
}
