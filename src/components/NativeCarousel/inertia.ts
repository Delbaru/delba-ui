import type { MotionTime } from '../../core/base/timing';

export interface NativeCarouselInertiaOptions {
    /** Override motion.defaults.carousel.inertiaDuration (seconds or a timing name). */
    duration?: MotionTime;
    /** Override motion.defaults.carousel.inertiaMaxSlides (additional positions after release). */
    maxSlides?: number;
    /** Override motion.defaults.carousel.inertiaMinimumVelocity (physical pixels per second). */
    minimumVelocity?: number;
}

export interface ResolvedCarouselInertia {
    enabled: boolean;
    duration: number;
    maxSlides: number;
    minimumVelocity: number;
}

/** Estimate momentum from recent pointer movement, with a bounded extrapolation past release. */
export function projectCarouselDrag(position: number, velocity: number, span: number, options: ResolvedCarouselInertia) {
    if (!options.enabled || span <= 0 || Math.abs(velocity) * 1000 < options.minimumVelocity) return { position, duration: 0 };
    // Integral of the normalized cubic ease-out velocity: distance = initial velocity * duration / 3.
    const extra = Math.min(Math.max(0, options.maxSlides) * span, Math.abs(velocity) * Math.max(0, options.duration) / 3);
    return { position: position + Math.sign(velocity) * extra, duration: options.duration };
}
