import { motionDefaults } from '../../core/base/motion-config';

export const MARQUEE_DEFAULTS = {
    as: 'div',
    speed: motionDefaults.marquee.speed,
    reverse: false,
    paused: false,
    draggable: true,
    fade: false,
} as const;
