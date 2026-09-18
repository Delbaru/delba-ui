"use client";

import { MEDIA_QUERY, cx, createLayoutClasses, radiusClasses, resolveRadiusInput, resolveResponsive, sizeClasses, splitRootDomProps, stateLinkProps, type GrowProps, type RadiusInput, type StateLinkInput, type ResponsiveValue, type SizeInput, type SizeValue, type WithRef, useMergedRefs } from '../core';
import type React from 'react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useSharedMotion, type SharedMotionProps } from '../hooks/useSharedMotion';

import styles from './Video.module.scss';

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

function resolveMediaSource(source?: MediaSource | null): string | undefined {
  if (!source) return undefined;

  return typeof source === 'string' ? source : source.src;
}

type VideoBaseProps = Omit<
  React.VideoHTMLAttributes<HTMLVideoElement>,
  | 'className'
  | 'style'
  | 'src'
  | 'width'
  | 'height'
  | 'poster'
>;

type VideoRootSizeProps = {
  rootW?: ResponsiveValue<SizeValue>;
  rootH?: ResponsiveValue<SizeValue>;
};

type VideoElementProps = VideoBaseProps & Record<string, unknown>;

export interface VideoProps extends VideoBaseProps, SizeInput, RadiusInput, VideoRootSizeProps, GrowProps, SharedMotionProps {
  className?: string;
  style?: CSSProperties;
  'data-point-events'?: string;

  /**
   * Ролик. Строка или `{ src }` — как раньше. Кортеж `[desktop, mobile, tablet]` — свой ролик
   * на полосу ширины (`VideoSrcTuple`): выбирается в браузере и меняется при смене ширины окна.
   */
  src?: MediaSource | VideoSrcTuple;
  /** Кадр до запуска. Кортеж — свой постер на полосу, по тем же правилам, что у `src`. */
  poster?: MediaSource | VideoSrcTuple;

  aspectRatio?: ResponsiveValue<string>;
  objectFit?: ResponsiveValue<ObjectFitKey>;
  objectPosition?: ResponsiveValue<string>;

  bg?: string;

  linkState?: StateLinkInput;
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
  ...props
}: WithRef<VideoProps, HTMLVideoElement>) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
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
  const radiusProps = resolveRadiusInput({ r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR });
  const { rootProps, elementProps } = splitRootDomProps(props as VideoElementProps);
  /*
    Ролик по полосам выбирается В БРАУЗЕРЕ, а не `<source media>`, как у картинки: у `<video>`
    источник берётся один раз при загрузке и при смене ширины сам не меняется (media у
    `<source>` видео поддержан не везде и тоже читается однажды). Поэтому ширину слушает
    `useMediaQuery` ядра, а смена полосы меняет `src`.

    До монтирования у кортежа адреса НЕТ: сервер экрана не знает, и отдай он десктопный —
    телефон начал бы качать десктопный ролик до гидратации. Скаляр — как раньше, сразу.
  */
  const isMobile = useMediaQuery(MEDIA_QUERY.mobile);
  const isBelowDesktop = useMediaQuery(MEDIA_QUERY.below);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pickSource = (source: MediaSource | VideoSrcTuple | undefined): string | undefined => {
    if (!Array.isArray(source)) return resolveMediaSource(source);
    if (!mounted) return undefined;

    const [desktop, mobile, tablet] = source;
    // Телефон — тоже «ниже десктопа»: без своего ролика он берёт планшетный, как по каскаду.
    if (isMobile && mobile !== null) return resolveMediaSource(mobile);
    if (isBelowDesktop && tablet !== null) return resolveMediaSource(tablet);
    return resolveMediaSource(desktop);
  };

  const resolvedSrc = pickSource(src);
  const resolvedPoster = pickSource(poster);
  const { motionHandlers, motionStyle, setMotionNode } = useSharedMotion({ perspective3d, parallax });

  const [objectFitResolved] = resolveResponsive(objectFit ?? 'cover');
  const [objectPositionResolved] = resolveResponsive(objectPosition ?? 'center');

  useEffect(() => {
    const node = videoRef.current;

    setIsPlaying(node ? !node.paused && !node.ended : autoPlay && Boolean(resolvedSrc));
  }, [autoPlay, resolvedSrc]);

  const setVideoRef = useMergedRefs(videoRef, ref);

  const setRootRef = useCallback((node: HTMLSpanElement | null) => {
    setMotionNode(node);
  }, [setMotionNode]);

  const handlePlayButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!resolvedSrc) return;

    videoRef.current?.play().catch(() => null);
  };

  const handlePlay = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsPlaying(true);
    onPlay?.(event);
  };

  const handlePause = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsPlaying(false);
    onPause?.(event);
  };

  const handleEnded = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsPlaying(false);
    onEnded?.(event);
  };

  return (
    <span
      ref={setRootRef}
      data-point-events={dataPointEvents}
      {...(rootProps as React.HTMLAttributes<HTMLSpanElement>)}
      {...stateLinkProps(linkState, { ...motionHandlers })}
      className={cx(
        styles.VideoRoot,
        ...sizeClasses(c, wrapperSizeProps),
        ...radiusClasses(c, radiusProps),
        ...c.value('bg', bg),
        ...c.value('ratio', aspectRatio),
        ...c.value('grow', grow),
        className
      )}
      style={{
        ...(motionStyle ?? null),
        ...(objectFitResolved ? ({ '--video-fit': objectFitResolved } as CSSProperties) : null),
        ...(objectPositionResolved ? ({ '--video-position': objectPositionResolved } as CSSProperties) : null),
        ...style,
      }}
    >
      {showPlayButton && resolvedSrc && !isPlaying ? (
        <button
          type="button"
          className={styles.VideoPlayButton}
          aria-label="Запустить видео"
          onClick={handlePlayButtonClick}
        >
          <span className={styles.VideoPlayButtonIcon} aria-hidden="true">▶</span>
        </button>
      ) : null}

      <video
        ref={setVideoRef}
        className={styles.Video}
        src={resolvedSrc}
        poster={resolvedPoster}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        playsInline={playsInline}
        loop={loop}
        preload={preload}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        {...elementProps}
      />
    </span>
  );
}

export default Video;
