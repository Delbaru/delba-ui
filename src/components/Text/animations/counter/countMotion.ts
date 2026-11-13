import { clamp01 } from '../../../../core';
import { configuredMotionEasing } from '../../../../core/base/motion-config';

/** One cancellable numeric transition; retargeting starts at the last frame actually written. */
export function createCountMotion(initial: number, onFrame: (value: number) => void) {
  let current = initial;
  let frame: number | undefined;
  function cancel() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  }
  function set(value: number) {
    cancel();
    current = value;
    onFrame(value);
  }
  function animate(to: number, duration: number, places = 0, start = current) {
    set(start);
    if (start === to || duration <= 0) {
      set(to);
      return;
    }
    const started = performance.now();
    const easing = configuredMotionEasing('counter');
    const scale = 10 ** places;
    function tick(now: number) {
      const progress = clamp01((now - started) / duration);
      current = progress === 1 ? to : Math.round((start + (to - start) * easing(progress)) * scale) / scale;
      onFrame(current);
      frame = progress < 1 ? requestAnimationFrame(tick) : undefined;
    }
    frame = requestAnimationFrame(tick);
  }
  function refresh() {
    onFrame(current);
  }
  return { animate, set, cancel, refresh };
}
