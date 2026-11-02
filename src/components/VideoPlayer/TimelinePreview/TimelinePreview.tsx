'use client';

import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cx, type WithRef } from '../../../core';
import { Text } from '../../Text';
import { Flex } from '../../Flex';
import type { VideoPlayerPreviewSource } from '../types';
import { formatClock } from '../VideoPlayer.config';
import styles from './TimelinePreview.module.scss';

export interface TimelinePreviewHandle {
    show(ratio: number, trackWidth: number, time: number): void;
    hide(): void;
}

/** Frame preview with one pending seek per animation frame; DOM position never rerenders the player. */
export function TimelinePreview({ ref, source }: WithRef<{ source?: VideoPlayerPreviewSource }, TimelinePreviewHandle>) {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const caretRef = useRef<HTMLSpanElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const pendingRef = useRef<number | null>(null);
    const rafRef = useRef(0);

    const [visible, setVisible] = useState(false);
    const [sec, setSec] = useState(0);
    const [framed, setFramed] = useState(true);
    const sourceRef = useRef(source);

    sourceRef.current = source;

    useImperativeHandle(ref, () => ({
        show(ratio, trackWidth, time) {
            const box = boxRef.current;

            if (box) {
                const half = box.offsetWidth / 2;
                const cursorPx = ratio * trackWidth;
                const leftPx = Math.min(Math.max(cursorPx, half), Math.max(trackWidth - half, half));

                box.style.left = `${leftPx}px`;

                if (caretRef.current) {
                    caretRef.current.style.left = `calc(50% + ${cursorPx - leftPx}px)`;
                }
            }

            const span = sourceRef.current;
            const inSpan = !!span && time >= span.from && time <= span.to;

            setFramed((prev) => (prev === inSpan ? prev : inSpan));
            pendingRef.current = inSpan && span ? time - span.from : null;

            const view = boxRef.current?.ownerDocument.defaultView;
            if (!rafRef.current && view) {
                rafRef.current = view.requestAnimationFrame(() => {
                    rafRef.current = 0;

                    const node = videoRef.current;
                    const pending = pendingRef.current;

                    if (node && pending != null) {
                        const nodeDuration = node.duration;
                        node.currentTime = Number.isFinite(nodeDuration) ? Math.min(pending, Math.max(nodeDuration - 0.05, 0)) : pending;
                    }
                });
            }

            const flooredSec = Math.floor(time);
            setVisible(true);
            setSec((prev) => (prev === flooredSec ? prev : flooredSec));
        },
        hide() {
            setVisible(false);
        },
    }), []);

    useEffect(() => {
        const view = boxRef.current?.ownerDocument.defaultView;
        return () => { if (rafRef.current) view?.cancelAnimationFrame(rafRef.current); };
    }, []);

    return (
        <Flex
            ref={boxRef}
            dir={['column', 'column', 'column']}
            align={['center', 'center', 'center']}
            gap={[6, 6, 6]}
            p={[6, 6, 6]}
            r={[12, 12, 12]}
            className={cx(styles.TimelinePreview, 'TimelinePreview')}
            data-visible={visible ? 'true' : 'false'}
            aria-hidden='true'
        >
            {source ? <video
                ref={videoRef}
                className={styles.previewVideo}
                data-framed={framed ? 'true' : 'false'}
                src={source.src}
                muted
                preload='auto'
                playsInline
            /> : null}

            <Text
                variant={['micro', null, null]}
                color='var(--white-100)'
                whiteSpace={['nowrap', null, null]}
            >{formatClock(sec)}</Text>

            <span ref={caretRef} className={styles.previewCaret} aria-hidden='true' />
        </Flex>
    );
}
