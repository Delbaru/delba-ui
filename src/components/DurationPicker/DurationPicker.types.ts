import type { ComponentProps } from 'react';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';
import type { Flex } from '../Flex';

export interface DurationPickerProps extends Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
  /** Motion channels on the surface around both wheels. */
  animate?: MotionChannels;
  /** Controlled duration in whole minutes. */
  value: number;
  /** Called after a wheel, pointer, click or keyboard change. */
  onValueChange: (minutes: number) => void;
  /** Inclusive duration limit, in minutes. Defaults to 24 hours. */
  maxMinutes?: number;
  /** Disables both wheels and removes them from keyboard navigation. */
  disabled?: boolean;
  /** Accessible name of the whole control. */
  'aria-label'?: string;
  /** Localized accessible names of the hour and minute wheels. */
  labels?: { hours: string; minutes: string };
  /** Additional root class. */
  className?: string;
  /** Reference to the stable root Flex node. */
  ref?: ComponentProps<typeof Flex>['ref'];
}
