'use client';

import type { WithRef } from '#core';
import { UI_MESSAGES } from '../../core/base/messages';
import { useVideo } from './Video.model';
import type { VideoProps } from './Video.types';
import styles from './Video.module.scss';

export function Video(props: WithRef<VideoProps, HTMLVideoElement>) {
  const video = useVideo(props);

  return (
    <span {...video.root}>
      {video.play && (
        <button
            type="button"
            className={styles.VideoPlayButton}
            aria-label={UI_MESSAGES.video.open}
            onClick={video.play}
        >
          <span className={styles.VideoPlayButtonIcon} aria-hidden="true">▶</span>
        </button>
      )}
      <video {...video.media} />
    </span>
  );
}

export default Video;
