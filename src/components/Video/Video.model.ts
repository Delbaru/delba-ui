'use client';

import { useEffect, useRef, useState, type MouseEvent, type Ref, type SyntheticEvent } from 'react';
import { MEDIA_QUERY, useMergedRefs } from '../../core';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { VideoProps, VideoSrcTuple } from './Video';

type Source = NonNullable<VideoProps['src']>;
type Viewport = { mounted: boolean; mobile: boolean; belowDesktop: boolean };

/** Tuple sources wait for hydration; scalar sources remain available during SSR. */
export function videoSource(source: Source | undefined, viewport: Viewport): string | undefined {
    const address = (value: VideoSrcTuple[number] | undefined) => typeof value === 'string' ? value : value?.src;
    if (!Array.isArray(source)) return address(source);
    if (!viewport.mounted) return undefined;
    const [desktop, mobile, tablet] = source;
    if (viewport.mobile && mobile !== null) return address(mobile);
    if (viewport.belowDesktop && tablet !== null) return address(tablet);
    return address(desktop);
}

/** Responsive source and the optional play overlay follow the real media element. */
export function useVideoMedia({ ref, src, poster, autoPlay, onPlay, onPause, onEnded }: Pick<VideoProps, 'src' | 'poster' | 'autoPlay' | 'onPlay' | 'onPause' | 'onEnded'> & { ref?: Ref<HTMLVideoElement> }) {
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
        setPlaying(node.current ? !node.current.paused && !node.current.ended : autoPlay && Boolean(source.src));
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
            onPlay(event: SyntheticEvent<HTMLVideoElement>) { setPlaying(true); onPlay?.(event); },
            onPause(event: SyntheticEvent<HTMLVideoElement>) { setPlaying(false); onPause?.(event); },
            onEnded(event: SyntheticEvent<HTMLVideoElement>) { setPlaying(false); onEnded?.(event); },
        },
    };
}
