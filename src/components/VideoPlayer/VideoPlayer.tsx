'use client';

import { cx, type WithRef } from '#core';
import { Flex } from '../Flex';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { Video } from '../Video';
import { VideoPlayerControls } from './VideoPlayerControls';
import { useVideoPlayerView } from './VideoPlayer.model';
import type { VideoPlayerProps } from './VideoPlayer.types';
import styles from './VideoPlayer.module.scss';

export function VideoPlayer(props: WithRef<VideoPlayerProps, HTMLDivElement>) {
    const view = useVideoPlayerView(props);

    return (
        <Flex {...view.root}>
            <Video {...view.media} />

            {view.interactive && (
                <div className={styles.clickLayer} aria-hidden="true" {...view.clickLayer} />
            )}

            {view.label && (
                <div className={cx(styles.overlay, styles.labelBar)}>
                    {view.labelIcon && (
                        <Icon
                            src={view.labelIcon}
                            w={[24, 24, 24]}
                            h={[24, 24, 24]}
                            fill="var(--white-100)"
                            stroke="var(--white-100)"
                        />
                    )}
                    <Text
                        variant={['body', null, null]}
                        color="var(--white-100)"
                        whiteSpace={['nowrap', null, null]}
                        minW={[0, 0, 0]}
                        ellipsis
                    >
                        {view.label}
                    </Text>
                </div>
            )}

            {view.interactive && (
                <VideoPlayerControls
                    state={view.state}
                    controls={view.controls}
                    timeline={view.timeline}
                    volume={view.volume}
                />
            )}
        </Flex>
    );
}

export default VideoPlayer;
