'use client';

import { UI_MESSAGES, formatUiMessage } from '../../core/base/messages';

import type { CSSProperties } from 'react';
import { createLayoutClasses, cx, resolveRadiusInput, sizeClasses, type WithRef } from '../../core';
import { Text } from '../Text';
import { Flex } from '../Flex';
import { Video } from '../Video';
import { IconSwap } from './IconSwap/IconSwap';
import { Icon } from '../Icon';
import { TimelinePreview } from './TimelinePreview/TimelinePreview';
import { useVideoPlayerView } from './VideoPlayer.model';
import { DEFAULT_RATES, ICON, formatClock, formatRate, nextRate } from './VideoPlayer.config';
import type { VideoPlayerProps } from './types';
import styles from './VideoPlayer.module.scss';

const c = createLayoutClasses(styles);

export function VideoPlayer({
    ref,
    controller,
    apiRef,
    src,
    poster,
    label,
    labelIcon,
    objectFit,
    aspectRatio,
    controls,
    preview,
    rates = DEFAULT_RATES,
    autoPlay,
    interactive = true,
    className,
    style,
    w,
    minW,
    maxW,
    h,
    minH,
    maxH,
    r,
    tlr,
    trr,
    brr,
    blr,
    borderTLR,
    borderTRR,
    borderBRR,
    borderBLR,
    grow,
}: WithRef<VideoPlayerProps, HTMLDivElement>) {
    const view = useVideoPlayerView({ ref, controller, apiRef, src, preview, controls, autoPlay });
    const { player, state, timeline, volume } = view;

    const rootClassName = cx(
        styles.VideoPlayer,
        !view.root.visible && interactive && styles.hidden,
        ...sizeClasses(c, { w, minW, maxW, h, minH, maxH }),
        ...c.value('ratio', aspectRatio),
        ...c.value('grow', grow),
        className,
    );

    const rootStyle: CSSProperties = {
        ...style,
    };

    return (
        <Flex
            ref={view.root.ref}
            position={['relative', 'relative', 'relative']}
            dir={['column', 'column', 'column']}
            justify={['space_between', 'space_between', 'space_between']}
            {...resolveRadiusInput({ r: r ?? [24, 24, 24], tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR })}
            className={rootClassName}
            style={rootStyle}
            onPointerMove={interactive ? view.root.reveal : undefined}
            onPointerEnter={interactive ? view.root.reveal : undefined}
            onPointerLeave={interactive ? view.root.leave : undefined}
        >
            <Video
                ref={view.media.ref}
                src={src}
                poster={poster}
                objectFit={objectFit}
                className={styles.media}
            />

            {/* Захват кликов по видео: одиночный = play/pause, двойной = фуллскрин */}
            {interactive ? (
                <div
                    className={styles.clickLayer}
                    onClick={view.media.click}
                    onDoubleClick={view.media.doubleClick}
                    aria-hidden='true'
                />
            ) : null}

            {label ? (
                <div className={cx(styles.overlay, styles.labelBar)}>
                    {labelIcon ? <Icon
                        src={labelIcon}
                        w={[24, 24, 24]}
                        h={[24, 24, 24]}
                        fill="var(--white-100)"
                        stroke="var(--white-100)"
                    /> : null}

                    <Text
                        variant={['body', null, null]}
                        color='var(--white-100)'
                        whiteSpace={['nowrap', null, null]}
                    >{label}</Text>
                </div>
            ) : null}

            {interactive ? (
                <div
                    className={cx(styles.overlay, styles.controlBar)}
                    onMouseEnter={view.controls.enter}
                    onMouseLeave={view.controls.leave}
                    onFocus={view.controls.focus}
                    onBlur={view.controls.blur}
                >
                    {view.controls.show('play') ? (
                        <button
                            type='button'
                            className={styles.button}
                            aria-label={state.playing ? UI_MESSAGES.video.pause : UI_MESSAGES.video.play}
                            onClick={() => player.toggle()}
                        >
                            <IconSwap active={state.playing} a={ICON.play} b={ICON.pause} />
                        </button>
                    ) : null}

                    {view.controls.show('timeline') ? (
                        <div
                            ref={timeline.ref}
                            className={styles.timeline}
                            role='slider'
                            tabIndex={0}
                            aria-label={UI_MESSAGES.video.seek}
                            aria-valuemin={0}
                            aria-valuemax={timeline.durationSec}
                            aria-valuenow={Math.min(timeline.currentSec, timeline.durationSec)}
                            aria-valuetext={formatUiMessage(UI_MESSAGES.video.time, { current: formatClock(timeline.currentSec), duration: formatClock(timeline.durationSec) })}
                            aria-disabled={timeline.durationSec > 0 ? undefined : true}
                            onKeyDown={timeline.keyDown}
                            {...timeline.bind}
                        >
                            <TimelinePreview
                                ref={timeline.previewRef}
                                source={timeline.previewSource}
                            />

                            <div className={styles.track}>
                                {/* Hover-заливка до курсора (другой цвет) — куда перематываешь */}
                                <div ref={timeline.hoverFillRef} className={styles.hoverFill} />

                                {/* Проигранная часть */}
                                <div ref={timeline.fillRef} className={styles.fill} />
                            </div>

                            {/* Точка-playhead на текущей позиции */}
                            <div
                                ref={timeline.dotRef}
                                className={styles.timelineDot}
                                aria-hidden='true'
                            />
                        </div>
                    ) : null}

                    {view.controls.show('time') ? (
                        <Text
                            variant={['micro', null, null]}
                            color='var(--white-100)'
                            whiteSpace={['nowrap', null, null]}
                        >
                            {formatClock(timeline.currentSec)} / {formatClock(timeline.durationSec)}
                        </Text>
                    ) : null}

                    {view.controls.show('rate') ? (
                        <button
                            type='button'
                            className={cx(styles.button, styles.rate)}
                            aria-label={formatUiMessage(UI_MESSAGES.video.rate, { rate: formatRate(state.rate) })}
                            onClick={() => player.setRate(nextRate(rates, state.rate))}
                        >
                            <Text
                                variant={['micro', null, null]}
                                color='var(--white-100)'
                                whiteSpace={['nowrap', null, null]}
                            >{formatRate(state.rate)}</Text>
                        </button>
                    ) : null}

                    {view.controls.show('volume') ? (
                        <div ref={volume.ref} className={styles.volume}>
                            <div className={styles.volumePopover}>
                                <div
                                    className={styles.volumeTrack}
                                    role='slider'
                                    tabIndex={0}
                                    aria-label={UI_MESSAGES.video.volume}
                                    aria-orientation='vertical'
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(volume.level * 100)}
                                    aria-valuetext={`${Math.round(volume.level * 100)}%`}
                                    onKeyDown={volume.keyDown}
                                    {...volume.bind}
                                >
                                    <div ref={volume.fillRef} className={styles.volumeFill} />
                                </div>
                            </div>

                            <button
                                type='button'
                                className={styles.button}
                                aria-label={volume.muted ? UI_MESSAGES.video.unmute : UI_MESSAGES.video.mute}
                                onClick={() => player.toggleMute()}
                            >
                                <IconSwap
                                    active={volume.muted}
                                    a={ICON.volume}
                                    b={ICON.volumeMuted}
                                />
                            </button>
                        </div>
                    ) : null}

                    {view.controls.show('fullscreen') ? (
                        <button
                            type='button'
                            className={styles.button}
                            aria-label={state.fullscreen ? UI_MESSAGES.video.exitFullscreen : UI_MESSAGES.video.fullscreen}
                            onClick={() => player.toggleFullscreen()}
                        >
                            <IconSwap
                                active={state.fullscreen}
                                a={ICON.fullscreen}
                                b={ICON.fullscreenQuit}
                            />
                        </button>
                    ) : null}
                </div>
            ) : null}
        </Flex>
    );
}

export default VideoPlayer;
