'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { clamp01, cx, resolveRadiusInput, useMergedRefs, type WithRef } from '#core';
import { usePointerRatio } from './usePointerRatio';
import { useVideoPlayer } from './useVideoPlayer';
import type { VideoPlayerProps, VideoPlayerController, VideoPlayerControlKey } from './VideoPlayer.types';
import type { TimelinePreviewHandle } from './TimelinePreview/TimelinePreview';
import { DEFAULT_CONTROLS, DEFAULT_RATES, VIDEO_PLAYER_LAYOUT, nextRate, resolveSrc } from './VideoPlayer.config';
import { readMotionDefaultMs, readMotionDefaultNumber } from '../../core/base/motion-config';
import styles from './VideoPlayer.module.scss';

type DragState = RefObject<boolean>;
type RootRef = RefObject<HTMLDivElement | null>;

/** Native playback is owned by the controller; this model connects it to the skin. */
export function useVideoPlayerView({
    ref, controller, apiRef, src, poster, objectFit, preview, controls, autoPlay,
    label, labelIcon, rates = DEFAULT_RATES, interactive = true,
    className, style, animate, perspective3d, parallax,
    w, minW, maxW, h, minH, maxH, aspectRatio, grow,
    r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR,
}: WithRef<VideoPlayerProps, HTMLDivElement>) {
    const internal = useVideoPlayer(autoPlay ? { autoPlay } : undefined);
    const player = controller ?? internal;
    const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
    const root = useRef<HTMLDivElement | null>(null);
    const rootRef = useMergedRefs(root, ref);
    const [media, setMedia] = useState<HTMLVideoElement | null>(null);
    const timeline = usePlayerTimeline(player, root);
    const volume = usePlayerVolume(player, state.muted ? 0 : state.volume, root);
    const interaction = usePlayerInteraction(player, root, state.playing, timeline.dragging, volume.dragging);
    const visibleControls = useMemo(() => new Set(controls ?? DEFAULT_CONTROLS), [controls]);
    const resolvedSrc = resolveSrc(src);
    const previewSource = useMemo(() => preview ?? (resolvedSrc ? { src: resolvedSrc, from: 0, to: Number.POSITIVE_INFINITY } : undefined), [preview, resolvedSrc]);

    useEffect(() => {
        if (!media) return;
        player._attach(media, root.current);
        return () => player._detach();
    }, [player, media]);

    useEffect(() => {
        if (!apiRef) return;
        const assign = (value: VideoPlayerController | null) => {
            if (typeof apiRef === 'function') apiRef(value);
            else apiRef.current = value;
        };
        assign(player);
        return () => assign(null);
    }, [apiRef, player]);

    return {
        state, label, labelIcon, interactive,
        root: {
            ref: rootRef,
            ...VIDEO_PLAYER_LAYOUT,
            ...resolveRadiusInput({
                r: r ?? VIDEO_PLAYER_LAYOUT.r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR,
            }),
            w, minW, maxW, h, minH, maxH, aspectRatio, grow,
            className: cx(styles.VideoPlayer, interactive && !interaction.visible && styles.hidden, className),
            style, animate, perspective3d, parallax,
            onPointerMove: interactive ? interaction.reveal : undefined,
            onPointerEnter: interactive ? interaction.reveal : undefined,
            onPointerLeave: interactive ? interaction.leave : undefined,
        },
        media: { ref: setMedia, src, poster, objectFit, className: styles.media },
        clickLayer: { onClick: interaction.click, onDoubleClick: interaction.doubleClick },
        controls: {
            ...interaction.controls,
            show: (key: VideoPlayerControlKey) => visibleControls.has(key),
            togglePlay: () => player.toggle(),
            cycleRate: () => player.setRate(nextRate(rates, state.rate)),
            toggleMute: () => player.toggleMute(),
            toggleFullscreen: () => player.toggleFullscreen(),
        },
        timeline: { ...timeline, previewSource, durationSec: Math.floor(state.duration) },
        volume: { ...volume, muted: state.muted || state.volume === 0 },
    };
}

/** Live progress writes stay local to the timeline; React only receives whole seconds. */
function usePlayerTimeline(player: VideoPlayerController, root: RootRef) {
    const track = useRef<HTMLDivElement | null>(null);
    const [fill, setFill] = useState<HTMLDivElement | null>(null);
    const [dot, setDot] = useState<HTMLDivElement | null>(null);
    const hoverFill = useRef<HTMLDivElement | null>(null);
    const preview = useRef<TimelinePreviewHandle | null>(null);
    const [currentSec, setCurrentSec] = useState(0);
    const paint = useCallback((ratio: number) => {
        const percent = `${clamp01(ratio) * 100}%`;
        if (fill) fill.style.width = percent;
        if (dot) dot.style.left = percent;
    }, [fill, dot]);
    const seek = useCallback((ratio: number) => {
        const bounded = clamp01(ratio);
        paint(bounded);
        setCurrentSec(Math.floor(bounded * player.duration));
        player.seek(bounded * player.duration);
    }, [paint, player]);
    const showPreview = useCallback((ratio: number) => {
        if (hoverFill.current) hoverFill.current.style.width = `${clamp01(ratio) * 100}%`;
        preview.current?.show(ratio, track.current?.clientWidth ?? 0, ratio * player.duration);
    }, [player]);
    const hidePreview = useCallback(() => preview.current?.hide(), []);
    const pointer = usePointerRatio({ orientation: 'x', onChange: seek, onHover: showPreview, onLeave: hidePreview });

    useEffect(() => {
        function paintTime(time: number) {
            const duration = player.duration;
            paint(duration > 0 ? time / duration : 0);
        }

        paintTime(player.getTime());
        return player.subscribeTime(time => {
            if (!pointer.isDragging.current) paintTime(time);
            const second = Math.floor(time);
            setCurrentSec(previous => previous === second ? previous : second);
        });
    }, [player, paint, pointer.isDragging]);

    function keyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (!(player.duration > 0)) return;
        const time = player.getTime();
        const step = readMotionDefaultNumber('videoPlayer', 'timelineStep', root.current ?? undefined);
        const page = player.duration * readMotionDefaultNumber('videoPlayer', 'timelinePageRatio', root.current ?? undefined);
        const targets: Record<string, number> = { ArrowRight: time + step, ArrowUp: time + step, ArrowLeft: time - step, ArrowDown: time - step, PageUp: time + page, PageDown: time - page, Home: 0, End: player.duration };
        const target = targets[event.key];
        if (target === undefined) return;
        event.preventDefault();
        seek(target / player.duration);
    }

    return {
        ref: track,
        fillRef: setFill,
        dotRef: setDot,
        hoverFillRef: hoverFill,
        previewRef: preview,
        currentSec,
        bind: pointer.bind,
        dragging: pointer.isDragging,
        keyDown,
    };
}

/** Wheel, pointer and keyboard write through the controller's volume command. */
function usePlayerVolume(player: VideoPlayerController, level: number, scope: RootRef) {
    const [node, setNode] = useState<HTMLDivElement | null>(null);
    const [fill, setFill] = useState<HTMLDivElement | null>(null);
    const apply = useCallback((next: number) => {
        const volume = clamp01(next);
        if (fill) fill.style.height = `${volume * 100}%`;
        player.setVolume(volume);
    }, [fill, player]);
    const pointer = usePointerRatio({ orientation: 'y', onChange: apply });
    useEffect(() => {
        if (fill) fill.style.height = `${clamp01(level) * 100}%`;
    }, [fill, level]);
    useEffect(() => {
        if (!node) return;
        const wheel = (event: WheelEvent) => {
            event.preventDefault();
            const step = readMotionDefaultNumber('videoPlayer', 'volumeStep', scope.current ?? undefined);
            apply((player.muted ? 0 : player.volume) + (event.deltaY < 0 ? step : -step));
        };
        node.addEventListener('wheel', wheel, { passive: false });
        return () => node.removeEventListener('wheel', wheel);
    }, [node, player, apply, scope]);
    function keyDown(event: KeyboardEvent<HTMLDivElement>) {
        const step = readMotionDefaultNumber('videoPlayer', 'volumeStep', scope.current ?? undefined);
        const targets: Record<string, number> = { ArrowRight: level + step, ArrowUp: level + step, ArrowLeft: level - step, ArrowDown: level - step, Home: 0, End: 1 };
        const target = targets[event.key];
        if (target === undefined) return;
        event.preventDefault();
        apply(target);
    }
    return {
        ref: setNode,
        fillRef: setFill,
        level,
        bind: pointer.bind,
        dragging: pointer.isDragging,
        keyDown,
    };
}

/** Idle visibility and click arbitration own one timer each, released with their document. */
function usePlayerInteraction(player: VideoPlayerController, root: RootRef, playing: boolean, timelineDrag: DragState, volumeDrag: DragState) {
    const [visible, setVisible] = useState(true);
    const lastActivity = useRef(0);
    const hovered = useRef(false);
    const focused = useRef(false);
    const clickTimer = useRef<number | null>(null);
    const clock = useCallback(() => root.current?.ownerDocument.defaultView?.performance.now() ?? 0, [root]);
    const reveal = useCallback(() => { lastActivity.current = clock(); setVisible(true); }, [clock]);
    const leave = useCallback(() => {
        if (!timelineDrag.current && !volumeDrag.current && !focused.current) setVisible(false);
    }, [timelineDrag, volumeDrag]);
    useEffect(() => {
        const view = root.current?.ownerDocument.defaultView;
        if (!playing || !view) return;
        lastActivity.current = clock();
        const timer = view.setInterval(() => {
            if (!hovered.current && !focused.current && !timelineDrag.current && !volumeDrag.current && clock() - lastActivity.current >= readMotionDefaultMs('videoPlayer', 'autoHideDuration', root.current ?? undefined)) setVisible(false);
        }, Math.max(16, readMotionDefaultMs('videoPlayer', 'controlsPollDuration', root.current ?? undefined)));
        return () => view.clearInterval(timer);
    }, [playing, root, clock, timelineDrag, volumeDrag]);
    useEffect(() => {
        const view = root.current?.ownerDocument.defaultView;
        return () => { if (clickTimer.current !== null) view?.clearTimeout(clickTimer.current); };
    }, [root]);
    function click() {
        reveal();
        const view = root.current?.ownerDocument.defaultView;
        if (clickTimer.current !== null || !view) return;
        clickTimer.current = view.setTimeout(() => { clickTimer.current = null; player.toggle(); }, readMotionDefaultMs('videoPlayer', 'doubleClickDuration', root.current ?? undefined));
    }
    function doubleClick() {
        if (clickTimer.current !== null) {
            root.current?.ownerDocument.defaultView?.clearTimeout(clickTimer.current);
            clickTimer.current = null;
        }
        player.toggleFullscreen();
    }
    return {
        visible, reveal, leave, click, doubleClick,
        controls: {
            enter() { hovered.current = true; reveal(); },
            leave() { hovered.current = false; },
            focus() { focused.current = true; reveal(); },
            blur(event: FocusEvent<HTMLDivElement>) {
                const Node = event.currentTarget.ownerDocument.defaultView?.Node;
                if (!Node || !(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) focused.current = false;
            },
        },
    };
}
