/** Imperative autoplay state. Durations are seconds; progress is clamped to 0..1. */
export interface CarouselPlaybackSnapshot {
    /** Full configured interval, in seconds. */
    readonly duration: number;
    /** Time consumed in the current slide interval, excluding holds, in seconds. */
    readonly elapsed: number;
    /** Time until the next automatic advance, in seconds. */
    readonly remaining: number;
    /** Consumed fraction of the interval, clamped to 0..1. */
    readonly progress: number;
    /** Autoplay is enabled; a hold does not disable it. */
    readonly playing: boolean;
    /** Enabled autoplay is held by an explicit pause, visibility, interaction or movement. */
    readonly paused: boolean;
}

export const INITIAL_CAROUSEL_PLAYBACK: CarouselPlaybackSnapshot = {
    duration: 0, elapsed: 0, remaining: 0, progress: 0, playing: false, paused: false,
};

/** Clock functions come from the mounted element's window, never a different realm. */
export interface PlaybackClockHost {
    now(): number;
    setTimeout(callback: () => void, delay: number): number;
    clearTimeout(id: number): void;
    requestAnimationFrame(callback: () => void): number;
    cancelAnimationFrame(id: number): void;
}

export interface CarouselPlaybackSource {
    getSnapshot(): CarouselPlaybackSnapshot;
    subscribe(listener: () => void): () => void;
}

/** One deadline owns autoplay. Animation frames exist only for subscribed indicators. */
export function createPlaybackClock(host: PlaybackClockHost, onElapsed: () => void) {
    let duration = 0;
    let elapsed = 0;
    let started = 0;
    let playing = false;
    let paused = false;
    let running = false;
    let destroyed = false;
    let timer: number | undefined;
    let frame: number | undefined;
    const listeners = new Set<() => void>();
    const currentElapsed = () => Math.min(duration, Math.max(0, elapsed + (running ? host.now() - started : 0)));
    const notify = () => { listeners.forEach(listener => listener()); };
    const clear = () => {
        if (timer !== undefined) host.clearTimeout(timer);
        if (frame !== undefined) host.cancelAnimationFrame(frame);
        timer = undefined;
        frame = undefined;
    };
    const frames = () => {
        if (!running || !listeners.size || frame !== undefined || destroyed) return;
        frame = host.requestAnimationFrame(() => { frame = undefined; notify(); frames(); });
    };
    const schedule = () => {
        clear();
        running = playing && !paused && duration > 0 && !destroyed;
        started = host.now();
        if (running) {
            timer = host.setTimeout(() => {
                timer = undefined;
                elapsed = duration;
                running = false;
                if (frame !== undefined) host.cancelAnimationFrame(frame);
                frame = undefined;
                notify();
                if (!destroyed) onElapsed();
            }, Math.max(0, duration - elapsed));
            frames();
        }
    };
    return {
        /** Delay uses internal DOM milliseconds; update preserves elapsed time, including repeated holds. */
        update(options: { delay: number; playing: boolean; paused: boolean }) {
            if (destroyed) return;
            elapsed = currentElapsed();
            duration = Number.isFinite(options.delay) ? Math.max(0, options.delay) : 0;
            elapsed = Math.min(elapsed, duration);
            playing = options.playing;
            paused = playing && options.paused;
            if (!playing) elapsed = 0;
            schedule();
            notify();
        },
        /** A new logical slide starts a full interval; pause/resume does not call reset. */
        reset() { if (destroyed) return; elapsed = 0; schedule(); notify(); },
        getSnapshot(): CarouselPlaybackSnapshot {
            const value = currentElapsed();
            return { duration: duration / 1000, elapsed: value / 1000, remaining: (duration - value) / 1000,
                progress: duration ? value / duration : 0, playing, paused };
        },
        subscribe(listener: () => void) {
            if (destroyed) return () => {};
            listeners.add(listener);
            frames();
            return () => {
                listeners.delete(listener);
                if (!listeners.size && frame !== undefined) { host.cancelAnimationFrame(frame); frame = undefined; }
            };
        },
        destroy() { destroyed = true; elapsed = currentElapsed(); running = false; clear(); listeners.clear(); },
    };
}
