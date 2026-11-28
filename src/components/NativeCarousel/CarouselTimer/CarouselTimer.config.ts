import type { CarouselPlaybackSnapshot } from '../playback';

export const formatRemainingSeconds = (snapshot: CarouselPlaybackSnapshot) => String(Math.ceil(snapshot.remaining));
