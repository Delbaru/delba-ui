import { Transition } from '../../core/base/transition';
import type { CarouselNavigationState } from '../Carousel/types';
import { INITIAL_CAROUSEL_PLAYBACK, type CarouselPlaybackSnapshot, type CarouselPlaybackSource } from './playback';
import { normalizedCarouselProgress, type CarouselMotionProgressSource } from './motion-progress';

export interface NativeCarouselSnapshot {
    /** Current logical page (zero based), including while it moves toward this page. */
    readonly index: number;
    /** Reachable positions; may be smaller than the slide count when several slides fit. */
    readonly pageCount: number;
    /** Number of source slides. */
    readonly slideCount: number;
    /** Whether the current geometry supports continuous wrapping without slide clones. */
    readonly looping: boolean;
    /** Whether a slide transition is active. */
    readonly moving: boolean;
    /** Whether automatic advancement is enabled by configuration or play(). */
    readonly playing: boolean;
    /** Whether enabled autoplay is currently held by pause, interaction or visibility. */
    readonly paused: boolean;
    /** Current boundary state used by external navigation. */
    readonly navigation: CarouselNavigationState;
}

export interface NativeCarouselController {
    /** Move one reachable position backward. A new command interrupts the previous move. */
    prev(): Transition;
    /** Move one reachable position forward. A new command interrupts the previous move. */
    next(): Transition;
    /** Move to a zero-based page. Indices are clamped, or wrapped when rewind is enabled. */
    goTo(index: number): Transition;
    /** Enable autoplay; clears an explicit pause or stop. */
    play(): void;
    /** Hold autoplay until play() is called; current slide movement may finish. */
    pause(): void;
    /** Disable autoplay until play() is called; does not silently restart on mouse leave. */
    stop(): void;
    /** Read the most recent boundary state without subscribing. */
    getNavigationState(): CarouselNavigationState;
    /** Stable discrete state, suitable for useSyncExternalStore. */
    getSnapshot(): NativeCarouselSnapshot;
    /** Receive discrete changes; returns the listener cleanup. Never called per pointer frame. */
    subscribe(listener: () => void): () => void;
    /** Read live autoplay timing in seconds without triggering a React render. */
    getPlaybackSnapshot(): CarouselPlaybackSnapshot;
    /** Subscribe an imperative indicator; frames stop when the last indicator unsubscribes. */
    subscribePlayback(listener: () => void): () => void;
    /** Actual track position, normalized to 0..1; loop motion wraps cyclically. Not autoplay timing. */
    readonly progress: number;
    /** Observe actual movement imperatively. Unsubscribing the last observer stops optional frame sampling. */
    subscribeProgress(listener: (progress: number) => void): () => void;
    /** Seek immediately to a fractional track position without snapping; invalid numbers are ignored. */
    seek(progress: number): void;
}

export interface CarouselDriver {
    goTo(index: number): Transition;
    step?(direction: -1 | 1): Transition;
    autoplay(command: 'play' | 'pause' | 'stop'): void;
    playback?: CarouselPlaybackSource;
    motionProgress?: CarouselMotionProgressSource;
}

export const INITIAL_NATIVE_CAROUSEL: NativeCarouselSnapshot = {
    index: 0, pageCount: 0, slideCount: 0, looping: false, moving: false, playing: false, paused: false,
    navigation: { isBeginning: true, isEnd: true, prevDisabled: true, nextDisabled: true },
};

const connections = new WeakMap<NativeCarouselController, {
    driver: CarouselDriver | null;
    publish(snapshot: NativeCarouselSnapshot): void;
    refreshPlayback(): void;
    refreshProgress(): void;
}>();

/** Creates a DOM-free controller. Prefer useCarouselController() inside React. */
export function createCarouselController(): NativeCarouselController {
    let snapshot = INITIAL_NATIVE_CAROUSEL;
    const listeners = new Set<() => void>();
    const playbackListeners = new Set<() => void>();
    let stopPlayback: (() => void) | undefined;
    const progressListeners = new Set<(progress: number) => void>();
    let stopProgress: (() => void) | undefined;
    const progress = (): number => normalizedCarouselProgress(connection.driver?.motionProgress?.getSnapshot() ?? 0);
    const connection = {
        driver: null as CarouselDriver | null,
        publish(next: NativeCarouselSnapshot) {
            snapshot = next;
            listeners.forEach(listener => listener());
        },
        refreshPlayback() {
            stopPlayback?.();
            stopPlayback = playbackListeners.size ? connection.driver?.playback?.subscribe(() => {
                playbackListeners.forEach(listener => listener());
            }) : undefined;
            playbackListeners.forEach(listener => listener());
        },
        refreshProgress() {
            stopProgress?.();
            stopProgress = progressListeners.size ? connection.driver?.motionProgress?.subscribe(value => {
                const normalized = normalizedCarouselProgress(value);
                progressListeners.forEach(listener => listener(normalized));
            }) : undefined;
            const value = progress();
            progressListeners.forEach(listener => listener(value));
        },
    };
    const controller: NativeCarouselController = {
        prev: () => connection.driver?.step?.(-1) ?? connection.driver?.goTo(snapshot.index - 1) ?? Transition.done(),
        next: () => connection.driver?.step?.(1) ?? connection.driver?.goTo(snapshot.index + 1) ?? Transition.done(),
        goTo: index => connection.driver?.goTo(index) ?? Transition.done(),
        play: () => connection.driver?.autoplay('play'),
        pause: () => connection.driver?.autoplay('pause'),
        stop: () => connection.driver?.autoplay('stop'),
        getSnapshot: () => snapshot,
        getNavigationState: () => snapshot.navigation,
        subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        getPlaybackSnapshot: () => connection.driver?.playback?.getSnapshot() ?? INITIAL_CAROUSEL_PLAYBACK,
        subscribePlayback(listener) {
            const subscription = () => listener();
            playbackListeners.add(subscription);
            if (playbackListeners.size === 1) connection.refreshPlayback();
            let active = true;
            return () => {
                if (!active) return;
                active = false;
                playbackListeners.delete(subscription);
                if (!playbackListeners.size) { stopPlayback?.(); stopPlayback = undefined; }
            };
        },
        get progress() { return progress(); },
        seek(value) { if (Number.isFinite(value)) connection.driver?.motionProgress?.seek(normalizedCarouselProgress(value)); },
        subscribeProgress(listener) {
            const subscription = (value: number) => listener(value);
            progressListeners.add(subscription);
            if (progressListeners.size === 1) connection.refreshProgress();
            else listener(progress());
            let active = true;
            return () => {
                if (!active) return;
                active = false;
                progressListeners.delete(subscription);
                if (!progressListeners.size) { stopProgress?.(); stopProgress = undefined; }
            };
        },
    };
    connections.set(controller, connection);
    return controller;
}

/** Internal lifecycle bridge. A controller belongs to one mounted carousel at a time. */
export function connectCarousel(controller: NativeCarouselController, driver: CarouselDriver) {
    const connection = connections.get(controller);
    if (!connection) throw new Error('Create the carousel controller with createCarouselController() or useCarouselController().');
    if (connection.driver) throw new Error('A carousel controller cannot control two mounted carousels.');
    connection.driver = driver;
    connection.refreshPlayback();
    connection.refreshProgress();
    return {
        publish: connection.publish,
        disconnect() {
            if (connection.driver !== driver) return;
            connection.driver = null;
            connection.refreshPlayback();
            connection.refreshProgress();
            connection.publish(INITIAL_NATIVE_CAROUSEL);
        },
    };
}
