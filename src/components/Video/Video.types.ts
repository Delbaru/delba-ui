import type { ComponentStateValue } from '#core';
import type { Preset, PresetMap, PresetStates } from '../../core/Preset';
import type { CSSProperties, VideoHTMLAttributes } from 'react';
import type { BoxLayoutProps, ResponsiveValue, SizeValue, StateLinkInput } from '#core';
import type { MotionChannels, SurfaceMotionOptions } from '#core/Motion';

type ObjectFitKey = 'contain' | 'cover' | 'fill' | 'none' | 'scale_down';
type MediaSource = string | { src: string };

/** Sources follow the desktop, mobile and tablet bands. Null inherits the wider band. */
export type VideoSrcTuple = [MediaSource, MediaSource | null, MediaSource | null];

type VideoBaseProps = Omit<
    VideoHTMLAttributes<HTMLVideoElement>,
    'className' | 'style' | 'src' | 'width' | 'height' | 'poster'
>;

export type VideoAnimate = Pick<MotionChannels, 'appearance'> & {
    hover?: Extract<MotionChannels['hover'], { effect: 'transform' }> | false;
};

export interface VideoProps
    extends VideoBaseProps,
        BoxLayoutProps,
        Pick<SurfaceMotionOptions, 'perspective3d' | 'parallax'> {
    preset?: Preset<VideoProps>;
    states?: PresetStates<VideoProps>;
    state?: ComponentStateValue;
    /** Additional wrapper class and styles. */
    className?: string;
    style?: CSSProperties;
    /** Pointer-event scope marker for composed media. */
    'data-point-events'?: string;

    /** Native media URL or sources selected per responsive band after hydration. */
    src?: MediaSource | VideoSrcTuple;
    /** Preview URL before playback, with the same responsive options as src. */
    poster?: MediaSource | VideoSrcTuple;

    /** Explicit wrapper dimensions override w and h. */
    rootW?: ResponsiveValue<SizeValue>;
    rootH?: ResponsiveValue<SizeValue>;
    /** Wrapper aspect ratio on each responsive band. */
    aspectRatio?: ResponsiveValue<string>;
    /** How the video fits its frame. */
    objectFit?: ResponsiveValue<ObjectFitKey>;
    objectPosition?: ResponsiveValue<string>;

    /** Appearance and hover motion apply to the existing wrapper. */
    animate?: VideoAnimate;
    /** Connect wrapper interaction to the shared link-state scope. */
    linkState?: StateLinkInput;
    /** Show an accessible play overlay while paused. Defaults to false. */
    showPlayButton?: boolean;
}

export type VideoPresets = PresetMap<VideoProps>;
