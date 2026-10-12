import type { MotionTime } from '../../../../core/base/timing';

export type CounterTrigger = 'onLoad' | 'onView';

export interface CounterOptions {
  to?: number;
  duration?: number;
  /** Время новой объектной формы animate: секунды или имя шкалы; legacy duration остаётся в мс. */
  durationTime?: MotionTime;
  start?: number;
  suffix?: string;
  trigger?: CounterTrigger;
  /** Группировать разряды пробелом (3000 → «3 000»). Для крупных метрик. */
  grouped?: boolean;
}
