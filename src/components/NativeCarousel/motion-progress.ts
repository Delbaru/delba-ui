/** Actual normalized track position. Distinct from the autoplay interval's progress. */
export interface CarouselMotionProgressSource {
    /** Read actual position: 0..1 along the finite track, cyclic 0..1 for a loop. */
    getSnapshot(): number;
    /** Observe position changes imperatively, without subscribing React to every animation frame. */
    subscribe(listener: (progress: number) => void): () => void;
    /** Seek immediately to a fractional position without snapping to a slide. */
    seek(progress: number): void;
}

/** Invalid reads resolve to the stable origin; commands ignore invalid numbers instead. */
export function normalizedCarouselProgress(progress: number): number {
    return Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
}

/** Observer ownership only: the DOM driver owns geometry, interpolation and seeking. */
export function createCarouselMotionProgress(options: {
    read: () => number;
    seek: (progress: number) => void;
    onSubscriptionChange?: (observed: boolean) => void;
}) {
    const listeners = new Set<(progress: number) => void>();
    let previous: number | undefined;
    return {
        getSnapshot: () => normalizedCarouselProgress(options.read()),
        seek(progress: number) { if (Number.isFinite(progress)) options.seek(normalizedCarouselProgress(progress)); },
        get subscriberCount() { return listeners.size; },
        subscribe(listener: (progress: number) => void) {
            // Independent registrations keep their cleanup independent even for the same function.
            const subscription = (progress: number) => listener(progress);
            listeners.add(subscription);
            if (listeners.size === 1) { previous = undefined; options.onSubscriptionChange?.(true); }
            let active = true;
            return () => {
                if (!active) return;
                active = false;
                listeners.delete(subscription);
                if (!listeners.size) options.onSubscriptionChange?.(false);
            };
        },
        publish(progress = options.read()) {
            const next = normalizedCarouselProgress(progress);
            if (next === previous) return;
            previous = next;
            listeners.forEach(listener => listener(next));
        },
    };
}
