import { createTransition, Transition } from './transition';
import { prefersReducedMotion } from './motion';
import { motionEasing, type MotionEasingPreset } from './easing';

/** Track-only movement: the root keeps independent reveal/parallax transforms. */
export function moveCarouselTrack(track: HTMLElement, from: number, to: number, duration: number, easing: MotionEasingPreset = motionEasing.easeOutCubic, orientation: 'horizontal' | 'vertical' = 'horizontal') {
    const transform = (value: number) => orientation === 'vertical' ? `translate3d(0, ${-value}px, 0)` : `translate3d(${-value}px, 0, 0)`;
    track.style.transform = transform(to);
    if (Math.abs(to - from) < 0.5 || duration <= 0 || prefersReducedMotion() || !track.animate) return Transition.done();
    const animation = track.animate([
        { transform: transform(from) },
        { transform: transform(to) },
    ], { duration, easing: easing.css });
    return createTransition([animation]);
}

/** One read when a movement is interrupted; never read geometry for each pointer event. */
export function carouselTrackPosition(track: HTMLElement, orientation: 'horizontal' | 'vertical' = 'horizontal'): number {
    const view = track.ownerDocument.defaultView;
    if (!view) return 0;
    const transform = view.getComputedStyle(track).transform;
    const Matrix = view.DOMMatrixReadOnly;
    if (!Matrix || transform === 'none') return 0;
    const matrix = new Matrix(transform);
    return -(orientation === 'vertical' ? matrix.m42 : matrix.m41);
}
