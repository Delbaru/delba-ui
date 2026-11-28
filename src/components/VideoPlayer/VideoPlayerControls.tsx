import { cx } from '#core';
import { UI_MESSAGES, formatUiMessage } from '../../core/base/messages';
import { Text } from '../Text';
import { IconSwap } from './IconSwap/IconSwap';
import { TimelinePreview } from './TimelinePreview/TimelinePreview';
import { ICON, formatClock, formatRate } from './VideoPlayer.config';
import type { useVideoPlayerView } from './VideoPlayer.model';
import styles from './VideoPlayer.module.scss';

type VideoPlayerControlsProps = Pick<ReturnType<typeof useVideoPlayerView>, 'state' | 'controls' | 'timeline' | 'volume'>;

export function VideoPlayerControls({ state, controls, timeline, volume }: VideoPlayerControlsProps) {
    return (
        <div
            className={cx(styles.overlay, styles.controlBar)}
            onMouseEnter={controls.enter}
            onMouseLeave={controls.leave}
            onFocus={controls.focus}
            onBlur={controls.blur}
        >
            {controls.show('play') ? (
                <button
                    type='button'
                    className={styles.button}
                    aria-label={state.playing ? UI_MESSAGES.video.pause : UI_MESSAGES.video.play}
                    onClick={controls.togglePlay}
                >
                    <IconSwap active={state.playing} a={ICON.play} b={ICON.pause} />
                </button>
            ) : null}

            {controls.show('timeline') ? (
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

            {controls.show('time') ? (
                <Text
                    variant={['micro', null, null]}
                    color='var(--white-100)'
                    whiteSpace={['nowrap', null, null]}
                >
                    {formatClock(timeline.currentSec)} / {formatClock(timeline.durationSec)}
                </Text>
            ) : null}

            {controls.show('rate') ? (
                <button
                    type='button'
                    className={cx(styles.button, styles.rate)}
                    aria-label={formatUiMessage(UI_MESSAGES.video.rate, { rate: formatRate(state.rate) })}
                    onClick={controls.cycleRate}
                >
                    <Text
                        variant={['micro', null, null]}
                        color='var(--white-100)'
                        whiteSpace={['nowrap', null, null]}
                    >{formatRate(state.rate)}</Text>
                </button>
            ) : null}

            {controls.show('volume') ? (
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
                        onClick={controls.toggleMute}
                    >
                        <IconSwap
                            active={volume.muted}
                            a={ICON.volume}
                            b={ICON.volumeMuted}
                        />
                    </button>
                </div>
            ) : null}

            {controls.show('fullscreen') ? (
                <button
                    type='button'
                    className={styles.button}
                    aria-label={state.fullscreen ? UI_MESSAGES.video.exitFullscreen : UI_MESSAGES.video.fullscreen}
                    onClick={controls.toggleFullscreen}
                >
                    <IconSwap
                        active={state.fullscreen}
                        a={ICON.fullscreen}
                        b={ICON.fullscreenQuit}
                    />
                </button>
            ) : null}
        </div>
    );
}
