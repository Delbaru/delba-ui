import { clamp } from '../utils';
/** A 60 Hz response coefficient, integrated over real frame time. Shared only by damping engines. */
export function frameResponse(response: number, elapsedMs: number, minimum = 0.001): number {
    return 1 - (1 - clamp(response, minimum, 1)) ** (Math.max(0, elapsedMs) / (1000 / 60));
}

/** Exponential response parameterized by a time constant, rather than a 60 Hz coefficient. */
export function timeResponse(timeSeconds: number, elapsedMs: number): number {
    return 1 - Math.exp(-Math.max(0, elapsedMs) / Math.max(1, timeSeconds * 1000));
}
