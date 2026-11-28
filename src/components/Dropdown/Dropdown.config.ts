import type { OpenMotionChannels } from '#core/Motion';

export const DROPDOWN_DEFAULTS = {
  offset: 8,
  viewportPadding: 8,
  backdrop: { appearance: { when: 'open', effect: 'fade', duration: 'fast' } },
} as const satisfies {
  offset: number;
  viewportPadding: number;
  backdrop: OpenMotionChannels;
};
