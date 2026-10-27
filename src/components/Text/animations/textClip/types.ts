export interface TextClipOptions {
  steps: string[];
  currentStep: number;
  /** Seconds or a timing name. */
  duration?: MotionTime;
  clipHeight?: string;
}
import type { MotionTime } from '../../../../core/base/timing';
