'use client';

import { useRef, type Ref } from 'react';

import styles from './Counter.module.scss';

import { useInView } from '../../../../core/useInView';
import { useCountUpNode } from './useCountUp';
import { resolveCounterContent } from './parseContent';
import type { TextAnimationContext } from '../types';
import type { CounterOptions } from './types';
import { motionDefaults } from '../../../../core/base/motion-config';
import { useMergedRefs } from '#core';

/**
 * Анимация счётчика: число едет от start к to. trigger='onView' (по умолчанию) запускает анимацию,
 * когда элемент попадает в зону видимости (и сбрасывает при уходе из неё), 'onLoad' — сразу.
 * 'onChange' сразу показывает первое значение, затем меняет цель от последнего показанного кадра.
 * inView наблюдается на собственном span'е плагина — Text про это ничего не знает.
 *
 * `to`/`suffix`/`grouped` можно не задавать: их достанет parseCountContent из текстового контента
 * (`70%` → 70 + «%», `до 50%` → «до» + 50 + «%»). Явные опции имеют приоритет над разбором; префикс
 * бывает только из разбора, так что при явном `to` текст перед числом не рисуется.
 *
 * Ширину коробки держит НЕВИДИМЫЙ близнец с ИТОГОВЫМ значением: он один остаётся в потоке (значит
 * и базовая линия, и перенос — его), а бегущее число лежит поверх абсолютом. Поэтому сосед справа
 * не дёргается, пока счётчик тикает, а в покое размер тот же, что и без анимации.
 */
export function Counter({ options, content }: TextAnimationContext<CounterOptions>) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const { isInView, setTarget } = useInView(ref, { threshold: motionDefaults.counter.threshold });
  const rootRef = useMergedRefs(ref, setTarget);

  const { to, places, text } = resolveCounterContent(content, options);
  const trigger = options?.trigger ?? 'onView';
  const changing = trigger === 'onChange';
  const shouldStart = changing || trigger === 'onLoad' || (trigger === 'onView' && isInView);

  const initial = useRef(changing ? to : options?.start ?? 0);
  const start = changing ? initial.current : options?.start ?? 0;
  useCountUpNode(
    valueRef,
    to,
    { duration: options?.duration, start, retarget: changing, places },
    shouldStart,
    !changing && !isInView,
    text,
  );

  return <CounterValue ref={rootRef} valueRef={valueRef} finalText={text(to)} currentText={text(start)} />;
}

/** The final value reserves space for the count on both standalone and timeline paths. */
export function CounterValue({ ref, valueRef, finalText, currentText }: {
  ref?: Ref<HTMLSpanElement>;
  valueRef: Ref<HTMLSpanElement>;
  finalText: string;
  currentText: string;
}) {
  return (
    <span ref={ref} className={styles.Counter}>
      <span aria-hidden className={styles.Reserve}>{finalText}</span>
      <span ref={valueRef} className={styles.Value}>{currentText}</span>
    </span>
  );
}
