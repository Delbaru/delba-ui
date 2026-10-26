import type { MotionTime } from '../../../../core/base/timing';

export interface TextSlideOptions {
  steps?: string[];
  currentStep?: number;
  duration?: number;
  /** Время объектной формы animate; legacy duration остаётся числом секунд. */
  durationTime?: MotionTime;
  lineHeight?: string;
  hoverColor?: string;
  /** 'swap' — слайд-своп значения при его смене (старое уезжает вверх, новое въезжает снизу). */
  mode?: 'swap';
  /** Сменять только различающиеся символы (по умолчанию) или весь текст, включая совпадающие буквы. */
  by?: 'character' | 'text';
}
