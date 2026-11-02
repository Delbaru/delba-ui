import type { GrowProps, RadiusInput, ResponsiveValue, SizeInput } from '../../core';
import type { CSSProperties } from 'react';
export type MediaSource = string | { src: string };

export type VideoPlayerObjectFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale_down';
export interface VideoPlayerPreviewSource {
    /** Media source URL or source object. */
    src: string;
    /** Start of the represented timeline segment, in seconds. */
    from: number;
    /** End of the represented timeline segment, in seconds. */
    to: number;
}
export type VideoPlayerControlKey = 'play' | 'timeline' | 'time' | 'rate' | 'volume' | 'fullscreen';
export interface VideoPlayerSnapshot {
    playing: boolean;
    volume: number;
    muted: boolean;
    duration: number;
    rate: number;
    fullscreen: boolean;
    ready: boolean;
}
export interface VideoPlayerApi {
    play(): void;
    pause(): void;
    toggle(): void;
    seek(seconds: number): void;
    scrubTo(seconds: number): void;
    seekBy(deltaSeconds: number): void;
    setVolume(value: number): void;
    mute(): void;
    unmute(): void;
    toggleMute(): void;
    setRate(rate: number): void;
    enterFullscreen(): void;
    exitFullscreen(): void;
    toggleFullscreen(): void;
}
export interface VideoPlayerController extends VideoPlayerApi {
    readonly playing: boolean;
    readonly volume: number;
    readonly muted: boolean;
    readonly duration: number;
    readonly rate: number;
    readonly fullscreen: boolean;
    readonly ready: boolean;
    readonly time: number;
    getTime(): number;
    subscribe(listener: () => void): () => void;
    getSnapshot(): VideoPlayerSnapshot;
    subscribeTime(listener: (time: number) => void): () => void;
    subscribeSeek(listener: (time: number) => void): () => void;
    _attach(video: HTMLVideoElement, root: HTMLElement | null): void;
    _detach(): void;
}

export interface UseVideoPlayerOptions {
    /** Initial volume from zero to one; defaults to one. */
    initialVolume?: number;
    /** Initial muted state; defaults to false. */
    initialMuted?: boolean;
    /** Initial playback rate; defaults to one. */
    initialRate?: number;
    /** Request playback when the internal controller attaches. */
    autoPlay?: boolean;
}
export type VideoPlayerApiRef = { current: VideoPlayerApi | null } | ((api: VideoPlayerApi | null) => void);

export interface VideoPlayerProps extends SizeInput, RadiusInput, GrowProps {
    /** Stable playback owner; omitted to create an internal controller. */
    controller?: VideoPlayerController;
    /** Receives commands while mounted and null during cleanup. */
    apiRef?: VideoPlayerApiRef;

    /** Media source URL or source object. */
    src?: MediaSource;
    /** Poster URL or source object. */
    poster?: MediaSource;
    /** Optional source label above the media. */
    label?: string;
    /** Optional icon resource beside the source label. */
    labelIcon?: string;

    /** Responsive fit of media inside its frame. */
    objectFit?: ResponsiveValue<VideoPlayerObjectFit>;
    /** Responsive player aspect ratio. */
    aspectRatio?: ResponsiveValue<string>;
    /** Visible controls; defaults to play, timeline, time, volume and fullscreen. */
    controls?: VideoPlayerControlKey[];

    /**
     * Кадры превью над таймлайном, когда `src` плееру не передают (медиа подставляет внешний
     * контроллер). Время превью — `t − from`; вне `[from, to]` показывается только время.
     */
    preview?: VideoPlayerPreviewSource;

    /** Скорости кнопки 'rate' по кругу, клик ставит следующую. По умолчанию `[1, 1.25, 1.5, 2]`. */
    rates?: number[];
    /** Request playback when the internal controller attaches. */
    autoPlay?: boolean;
    /** Enable the control bar and media clicks; defaults to true. */
    interactive?: boolean;

    /** Additional root class. */
    className?: string;
    /** Inline root styles. */
    style?: CSSProperties;
}
