'use client';

import { UI_MESSAGES } from '../../core/base/messages';

import {
    boxLayout,
  cx,
  createLayoutClasses,
  resolveRadiusInput,
  sizeClasses,
  splitBoxLayout,
  splitRootDomProps,
  stateLinkProps,
  type BoxLayoutProps,
  type StateLinkInput,
  type ResponsiveValue,
  type SizeValue,
  type WithRef,
} from '../../core';
import type React from 'react';
import { useCallback, type CSSProperties } from 'react';
import { useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';

import styles from './Video.module.scss';
import { useVideoMedia } from './Video.model';

const c = createLayoutClasses(styles);

type ObjectFitKey = 'contain' | 'cover' | 'fill' | 'none' | 'scale_down';
type MediaSource = string | { src: string };

/**
 * Свой ролик (или постер) на полосу ширины: `[desktop, mobile, tablet]`, порядок кита.
 * `null` — пропуск полосы: она получает то, что получила бы по каскаду (планшет без своего —
 * десктопный, телефон без своего — планшетный, если он есть). Та же договорённость, что у
 * `ImgSrcTuple` у картинки.
 *
 * Отдельный тип, а не `ResponsiveValue`: под `strictTuple` проекта тот запрещает скаляр, а
 * `src="…"` строкой обязан работать как раньше.
 */
export type VideoSrcTuple = [MediaSource, MediaSource | null, MediaSource | null];

type VideoBaseProps = Omit<
  React.VideoHTMLAttributes<HTMLVideoElement>,
  'className' | 'style' | 'src' | 'width' | 'height' | 'poster'
>;

type VideoRootSizeProps = {
  rootW?: ResponsiveValue<SizeValue>;
  rootH?: ResponsiveValue<SizeValue>;
};

type VideoElementProps = VideoBaseProps & Record<string, unknown>;

export interface VideoProps
  extends VideoBaseProps,
    BoxLayoutProps,
    VideoRootSizeProps,
    SharedMotionProps {
  /** Additional wrapper class. */
  className?: string;
  /** Inline wrapper styles. */
  style?: CSSProperties;
  /** Pointer-event scope marker for composed media. */
  'data-point-events'?: string;

  /**
   * Ролик. Строка или `{ src }` — как раньше. Кортеж `[desktop, mobile, tablet]` — свой ролик
   * на полосу ширины (`VideoSrcTuple`): выбирается в браузере и меняется при смене ширины окна.
   */
  src?: MediaSource | VideoSrcTuple;
  /** Кадр до запуска. Кортеж — свой постер на полосу, по тем же правилам, что у `src`. */
  poster?: MediaSource | VideoSrcTuple;

  /** Wrapper aspect ratio on each responsive band. */
  aspectRatio?: ResponsiveValue<string>;
  /** How the video fits its frame; defaults to cover. */
  objectFit?: ResponsiveValue<ObjectFitKey>;
  /** Video alignment inside its frame; defaults to center. */
  objectPosition?: ResponsiveValue<string>;

  /** Connect wrapper interaction to the shared link-state scope. */
  linkState?: StateLinkInput;
  /** Show an accessible play overlay while paused; defaults to false. */
  showPlayButton?: boolean;
}

export function Video({
  ref,
  className = '',
  style,
  'data-point-events': dataPointEvents,
  src,
  poster,
  w,
  minW,
  maxW,
  h,
  minH,
  maxH,
  rootW,
  rootH,
  grow,
  r,
  tlr,
  trr,
  brr,
  blr,
  borderTLR,
  borderTRR,
  borderBRR,
  borderBLR,
  aspectRatio,
  objectFit,
  objectPosition,
  bg,
  linkState,
  perspective3d,
  parallax,
  animate,
  showPlayButton = false,
  controls = false,
  autoPlay = false,
  muted = false,
  playsInline = true,
  loop,
  preload,
  onPlay,
  onPause,
  onEnded,
  ...rest
}: WithRef<VideoProps, HTMLVideoElement>) {
  const { box, rest: props } = splitBoxLayout(rest);
  const media = useVideoMedia({ ref, src, poster, autoPlay, onPlay, onPause, onEnded });
  const sizeProps = {
    w,
    minW,
    maxW,
    h,
    minH,
    maxH,
  };
  const wrapperSizeProps = {
    w: rootW ?? sizeProps.w,
    minW: sizeProps.minW,
    maxW: sizeProps.maxW,
    h: rootH ?? sizeProps.h,
    minH: sizeProps.minH,
    maxH: sizeProps.maxH,
  };
  const radiusProps = resolveRadiusInput({
    r,
    tlr,
    trr,
    brr,
    blr,
    borderTLR,
    borderTRR,
    borderBRR,
    borderBLR,
  });
  const { rootProps, elementProps } = splitRootDomProps(props as VideoElementProps);
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({
    perspective3d,
    parallax,
    animate,
  });

  const setRootRef = useCallback(
    (node: HTMLSpanElement | null) => {
      setMotionNode(node);
    },
    [setMotionNode],
  );

  return (
    <span
      ref={setRootRef}
      data-point-events={dataPointEvents}
      {...(rootProps as React.HTMLAttributes<HTMLSpanElement>)}
      {...revealAttrs}
      {...stateLinkProps(linkState, { ...motionHandlers })}
      className={cx(
        styles.Video, 'Video',
        ...sizeClasses(c, wrapperSizeProps),
        ...boxLayout(c, { ...box, ...radiusProps, bg, aspectRatio, grow }),
        className,
      )}
      style={{
        ...(motionStyle ?? null),
        ...style,
      }}
    >
      {showPlayButton && media.source.src && !media.playback.playing ? (
        <button
            type="button"
            className={styles.VideoPlayButton}
            aria-label={UI_MESSAGES.video.open}
            onClick={media.playback.start}
        >
          <span className={styles.VideoPlayButtonIcon} aria-hidden="true">
            ▶
          </span>
        </button>
      ) : null}

      <video
        ref={media.ref}
        className={cx(
          styles.VideoElement,
          ...c.value('objectFit', objectFit ?? 'cover'),
          ...c.value('objectPosition', objectPosition ?? 'center'),
        )}
        src={media.source.src}
        poster={media.source.poster}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        playsInline={playsInline}
        loop={loop}
        preload={preload}
        onPlay={media.events.onPlay}
        onPause={media.events.onPause}
        onEnded={media.events.onEnded}
        {...elementProps}
      />
    </span>
  );
}

export default Video;
