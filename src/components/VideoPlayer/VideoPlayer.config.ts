import { assetUrl, pad } from '../../core';
import type { MediaSource, VideoPlayerControlKey } from './types';
import playIcon from '../../../assets/icons/ui/play/style-2/play.svg';
import pauseIcon from '../../../assets/icons/ui/pause/style-1/pause.svg';
import volumeIcon from '../../../assets/icons/ui/volume/style-1/volume.svg';
import volumeMutedIcon from '../../../assets/icons/ui/volume/style-1/volume-muted.svg';
import fullscreenIcon from '../../../assets/icons/ui/fullscreen/style-1/fullscreen.svg';
import fullscreenQuitIcon from '../../../assets/icons/ui/fullscreen/style-1/fullscreen-quit.svg';


export const DEFAULT_CONTROLS: VideoPlayerControlKey[] = ['play', 'timeline', 'time', 'volume', 'fullscreen'];

export const DEFAULT_RATES = [1, 1.25, 1.5, 2];

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

/** Formats finite playback time as HH:MM:SS. */
export function formatClock(totalSeconds: number): string {
    const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;

    return `${pad(Math.floor(safe / 3600))}:${pad(Math.floor((safe % 3600) / 60))}:${pad(safe % 60)}`;
}



export function resolveSrc(source?: MediaSource): string | undefined {
    if (!source) return undefined;

    return typeof source === 'string' ? source : source.src;
}
