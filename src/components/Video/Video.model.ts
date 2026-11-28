'use client';

import { resolvePresetProps } from '../../core/Preset';
import { useEffect, useRef, useState, type MouseEvent, type Ref, type SyntheticEvent } from 'react';
import {
    boxLayout,
    createLayoutClasses,
    cx,
    MEDIA_QUERY,
    stateProps,
    splitBoxLayout,
    splitRootDomProps,
    useMergedRefs,
    type WithRef,
} from '#core';
import { useElement } from '#core/Element';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { VIDEO_DEFAULTS } from './Video.config';
import type { VideoProps, VideoSrcTuple } from './Video.types';
import styles from './Video.module.scss';

type Source = NonNullable<VideoProps['src']>;
type Viewport = { mounted: boolean; mobile: boolean; belowDesktop: boolean };
const classes = createLayoutClasses();

/** Tuple sources wait for hydration; scalar sources remain available during SSR. */
export function videoSource(source: Source | undefined, viewport: Viewport): string | undefined {
    const address = (value: VideoSrcTuple[number] | undefined) =>
        typeof value === 'string' ? value : value?.src;
    if (!Array.isArray(source)) return address(source);
    if (!viewport.mounted) return undefined;
    const [desktop, mobile, tablet] = source;
    if (viewport.mobile && mobile !== null) return address(mobile);
    if (viewport.belowDesktop && tablet !== null) return address(tablet);
    return address(desktop);
}

/** Responsive source and the optional play overlay follow the real media element. */
function useVideoMedia({
    ref,
    src,
    poster,
    autoPlay,
    onPlay,
    onPause,
    onEnded,
}: Pick<VideoProps, 'src' | 'poster' | 'autoPlay' | 'onPlay' | 'onPause' | 'onEnded'> & {
    ref?: Ref<HTMLVideoElement>;
}) {
    const node = useRef<HTMLVideoElement | null>(null);
    const mobile = useMediaQuery(MEDIA_QUERY.mobile);
    const belowDesktop = useMediaQuery(MEDIA_QUERY.below);
    const [mounted, setMounted] = useState(false);
    const [playing, setPlaying] = useState(autoPlay);
    useEffect(() => setMounted(true), []);

    const viewport = { mounted, mobile, belowDesktop };
    const source = { src: videoSource(src, viewport), poster: videoSource(poster, viewport) };
    const mergedRef = useMergedRefs(node, ref);
    useEffect(() => {
        setPlaying(
            node.current
                ? !node.current.paused && !node.current.ended
                : autoPlay && Boolean(source.src),
        );
    }, [autoPlay, source.src]);

    return {
        ref: mergedRef,
        source,
        playback: {
            playing,
            start(event: MouseEvent<HTMLButtonElement>) {
                event.preventDefault();
                event.stopPropagation();
                if (source.src) node.current?.play().catch(() => null);
            },
        },
        events: {
            onPlay(event: SyntheticEvent<HTMLVideoElement>) {
                setPlaying(true);
                onPlay?.(event);
            },
            onPause(event: SyntheticEvent<HTMLVideoElement>) {
                setPlaying(false);
                onPause?.(event);
            },
            onEnded(event: SyntheticEvent<HTMLVideoElement>) {
                setPlaying(false);
                onEnded?.(event);
            },
        },
    };
}

export function useVideo(input: WithRef<VideoProps, HTMLVideoElement>) {
    const props = resolvePresetProps(input);
    const { box, rest } = splitBoxLayout(props);
    const {
        ref,
        state,
        className,
        style,
        'data-point-events': dataPointEvents,
        src,
        poster,
        rootW,
        rootH,
        objectFit,
        objectPosition,
        linkState,
        perspective3d,
        parallax,
        animate,
        onPlay,
        onPause,
        onEnded,
        showPlayButton = VIDEO_DEFAULTS.showPlayButton,
        controls = VIDEO_DEFAULTS.controls,
        autoPlay = VIDEO_DEFAULTS.autoPlay,
        muted = VIDEO_DEFAULTS.muted,
        playsInline = VIDEO_DEFAULTS.playsInline,
        ...native
    } = rest;
    const { rootProps, elementProps } = splitRootDomProps(native);
    const media = useVideoMedia({ ref, src, poster, autoPlay, onPlay, onPause, onEnded });
    const element = useElement<HTMLSpanElement>({
        motion: {
            perspective3d,
            parallax,
            animate: {
                appearance: animate?.appearance,
                hover:
                    animate?.hover && animate.hover.effect === 'transform'
                        ? animate.hover
                        : undefined,
            },
        },
        style,
        linkState,
    });

    return {
        root: {
            ...stateProps(state),
            ...rootProps,
            ...element.attributes,
            ...element.events,
            ref: element.ref,
            'data-point-events': dataPointEvents,
            className: cx(
                styles.Video,
                element.className,
                ...boxLayout(classes, { ...box, w: rootW ?? box.w, h: rootH ?? box.h }),
                className,
            ),
            style: element.style,
        },
        media: {
            ...elementProps,
            ...media.source,
            ...media.events,
            controls,
            autoPlay,
            muted,
            playsInline,
            ref: media.ref,
            className: cx(
                styles.VideoElement,
                ...classes.value('objectFit', objectFit ?? VIDEO_DEFAULTS.objectFit),
                ...classes.value('objectPosition', objectPosition ?? VIDEO_DEFAULTS.objectPosition),
            ),
        },
        play:
            showPlayButton && media.source.src && !media.playback.playing
                ? media.playback.start
                : undefined,
    };
}
