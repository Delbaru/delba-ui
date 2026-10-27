export {
    motionEasing,
    cubicBezier,
    type Easing,
    type MotionEasingName,
    type MotionEasingPreset,
    type MotionEasingRole,
} from './core/base/easing';
export {
    type MotionDefaultOverrides,
    type MotionDefaults,
} from './core/base/motion-defaults';
export { motionDefaults } from './core/base/motion-config';
export type {
    ObserverMargin,
    ObserverMargins,
    ObserverMarginValue,
} from './core/base/observer-margin';
import { motionEasing } from './core/base/easing';

/** Кривые скролла: публичный словарь с автодополнением, без React и стилей. */
export const scrollEasing = {
    /** Равномерная скорость. */
    linear: motionEasing.linear,
    /** Плавный разгон и торможение. */
    ease: motionEasing.easeInOutCubic,
    /** Постепенный разгон. */
    easeIn: motionEasing.easeInCubic,
    /** Плавное торможение. */
    easeOut: motionEasing.easeOutCubic,
    /** Симметричный разгон и торможение; та же кривая, что ease. */
    easeInOut: motionEasing.easeInOutCubic,
    /** Быстрый старт и долгое мягкое торможение. */
    easeOutExpo: motionEasing.easeOutExpo,
} as const;
