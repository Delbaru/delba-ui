import assert from 'node:assert/strict';
import test from 'node:test';
import { createVideoPlayerController } from '../useVideoPlayer';

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

test('controller follows its media document and detaches the previous binding', () => {
    let scheduled = 0;
    let cancelled = 0;
    const owner = Object.assign(new EventTarget(), {
        fullscreenElement: null as HTMLElement | null,
        defaultView: {
            requestAnimationFrame: () => ++scheduled,
            cancelAnimationFrame: () => { cancelled++; },
        },
    });
    const root = { ownerDocument: owner } as unknown as HTMLElement;
    const makeVideo = (paused: boolean) => Object.assign(new EventTarget(), {
        ownerDocument: owner, volume: 1, muted: false, playbackRate: 1,
        duration: 20, currentTime: 0, readyState: 1, paused, ended: false,
    }) as unknown as HTMLVideoElement;
    const first = makeVideo(false);
    const second = makeVideo(true);
    const controller = createVideoPlayerController();
    const stopTime = controller.subscribeTime(() => undefined);
    controller._attach(first, root);
    assert.equal(scheduled, 1);
    controller._attach(second, root);
    assert.equal(cancelled, 1);
    first.volume = 0.2;
    first.dispatchEvent(new Event('volumechange'));
    assert.equal(controller.volume, 1);
    second.playbackRate = 1.5;
    second.dispatchEvent(new Event('ratechange'));
    assert.equal(controller.rate, 1.5);
    owner.fullscreenElement = root;
    owner.dispatchEvent(new Event('fullscreenchange'));
    assert.equal(controller.fullscreen, true);
    second.dispatchEvent(new Event('emptied'));
    assert.equal(controller.ready, false);
    assert.equal(controller.duration, 0);
    controller._detach();
    owner.fullscreenElement = null;
    owner.dispatchEvent(new Event('fullscreenchange'));
    assert.equal(controller.fullscreen, true, 'detached controller no longer listens to document events');
    stopTime();
});
