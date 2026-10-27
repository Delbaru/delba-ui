import assert from 'node:assert/strict';
import test from 'node:test';
import { createVideoPlayerController } from './useVideoPlayer';

test('fullscreen state and commands belong to this player, not another document element', () => {
    const globals = globalThis as Record<string, unknown>;
    const original = globals.document;
    let exited = 0;
    let requested = 0;
    const firstRoot = {} as HTMLElement;
    const secondRoot = {
        requestFullscreen: () => {
            requested++;
            return Promise.resolve();
        },
    } as unknown as HTMLElement;
    const document = Object.assign(new EventTarget(), {
        fullscreenElement: null as HTMLElement | null,
        exitFullscreen: () => {
            exited++;
            return Promise.resolve();
        },
    });
    globals.document = document;
    const video = () =>
        Object.assign(new EventTarget(), {
            volume: 1,
            muted: false,
            playbackRate: 1,
            duration: 20,
            currentTime: 0,
            readyState: 1,
            paused: true,
            ended: false,
        }) as unknown as HTMLVideoElement;
    const first = createVideoPlayerController();
    const second = createVideoPlayerController();
    try {
        first._attach(video(), firstRoot);
        second._attach(video(), secondRoot);
        document.fullscreenElement = firstRoot;
        document.dispatchEvent(new Event('fullscreenchange'));
        assert.equal(first.fullscreen, true);
        assert.equal(second.fullscreen, false);
        second.exitFullscreen();
        assert.equal(exited, 0);
        second.toggleFullscreen();
        assert.equal(requested, 1);
        document.fullscreenElement = secondRoot;
        document.dispatchEvent(new Event('fullscreenchange'));
        assert.equal(first.fullscreen, false);
        assert.equal(second.fullscreen, true);
        second.toggleFullscreen();
        assert.equal(exited, 1);
    } finally {
        first._detach();
        second._detach();
        globals.document = original;
    }
});
