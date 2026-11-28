import { assetUrl, pad } from '#core';
import type { FlexProps } from '../Flex';
import type { MediaSource, VideoPlayerControlKey } from './VideoPlayer.types';
import playIcon from '#icons/controls/play.svg';
import pauseIcon from '#icons/controls/pause.svg';
import volumeIcon from '#icons/controls/volume.svg';
import volumeMutedIcon from '#icons/controls/volume-mute.svg';
import fullscreenIcon from '#icons/controls/fullscreen.svg';
import fullscreenQuitIcon from '#icons/controls/fullscreen-exit.svg';


export const DEFAULT_CONTROLS: VideoPlayerControlKey[] = ['play', 'timeline', 'time', 'volume', 'fullscreen'];

export const DEFAULT_RATES = [1, 1.25, 1.5, 2];

export const VIDEO_PLAYER_LAYOUT = {
    position: ['relative', 'relative', 'relative'],
    dir: ['column', 'column', 'column'],
    justify: ['space_between', 'space_between', 'space_between'],
    r: [24, 24, 24],
} satisfies Pick<FlexProps, 'position' | 'dir' | 'justify' | 'r'>;

// Следующая скорость по кругу; текущей нет в списке — первая.
export function nextRate(rates: number[], current: number): number {
    const index = rates.indexOf(current);

    return rates[(index + 1) % rates.length] ?? current;
}

export function formatRate(rate: number): string {
    return `${String(rate).replace('.', ',')}×`;
}

// Shared control glyphs.
export const ICON = {
    play: assetUrl(playIcon),
    pause: assetUrl(pauseIcon),
    volume: assetUrl(volumeIcon),
    volumeMuted: assetUrl(volumeMutedIcon),
    fullscreen: assetUrl(fullscreenIcon),
    fullscreenQuit: assetUrl(fullscreenQuitIcon),
};

/** Minutes and seconds for short clips; hours appear only when needed. */
export function formatClock(totalSeconds: number): string {
    const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;

    const minutes = `${pad(Math.floor((safe % 3600) / 60))}:${pad(safe % 60)}`;
    return safe >= 3600 ? `${pad(Math.floor(safe / 3600))}:${minutes}` : minutes;
}



export function resolveSrc(source?: MediaSource): string | undefined {
    if (!source) return undefined;

    return typeof source === 'string' ? source : source.src;
}
