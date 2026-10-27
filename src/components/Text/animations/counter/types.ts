import type { MotionTime } from '../../../../core/base/timing';

export type CounterTrigger = 'onLoad' | 'onView';

export interface CounterOptions {
  to?: number;
  /** Seconds or a timing name in both object and tuple forms. */
  duration?: MotionTime;
  start?: number;
  suffix?: string;
  trigger?: CounterTrigger;
  /** Группировать разряды пробелом (3000 → «3 000»). Для крупных метрик. */
  grouped?: boolean;
}
