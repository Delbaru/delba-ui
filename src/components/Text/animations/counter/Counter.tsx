'use client';

import { useRef } from 'react';

import styles from './Counter.module.scss';
import { cx } from '../../../../core';

import { useInView } from '../../../../core/useInView';
import { useCountUpNode } from './useCountUp';
import { parseCountContent } from './parseContent';
import type { TextAnimationContext } from '../types';
import type { CounterOptions } from './types';
import { motionDefaults } from '../../../../core/base/motion-config';
import { useMergedRefs } from '../../../../core';

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

  const parsed = options?.to == null ? parseCountContent(content) : null;
  const to = options?.to ?? parsed?.to ?? 0;
  const prefix = parsed?.prefix ?? '';
  const suffix = options?.suffix ?? parsed?.suffix ?? '';
  const grouped = options?.grouped ?? parsed?.grouped ?? false;
  const trigger = options?.trigger ?? 'onView';
  const changing = trigger === 'onChange';
  const shouldStart = changing || trigger === 'onLoad' || (trigger === 'onView' && isInView);

  const initial = useRef(changing ? to : options?.start ?? 0);
  const start = changing ? initial.current : options?.start ?? 0;
  const decimal = parsed?.decimal;
  const format = (value: number) => {
    if (!decimal) return grouped ? value.toLocaleString('ru-RU') : String(value);
    const formatted = value.toLocaleString('ru-RU', {
      useGrouping: grouped,
      minimumFractionDigits: decimal.places,
      maximumFractionDigits: decimal.places,
    });
    return decimal.separator === ',' ? formatted : formatted.replace(',', decimal.separator);
  };
  const text = (value: number) => `${prefix}${format(value)}${suffix}`;

  useCountUpNode(
    valueRef,
    to,
    { duration: options?.duration, start, retarget: changing, places: decimal?.places },
    shouldStart,
    !changing && !isInView,
    text,
  );

  return (
    <span ref={rootRef} className={cx(styles.Counter, 'ui-counter')}>
      <span aria-hidden className={'ui-counter-reserve'}>
        {prefix}
        {format(to)}
        {suffix}
      </span>

      <span ref={valueRef} className={'ui-counter-value'}>
        {text(start)}
      </span>
    </span>
  );
}
