import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlaybackClock, type PlaybackClockHost } from './playback';

function harness() {
    let now = 0;
    let sequence = 0;
    const timers = new Map<number, { at: number; callback: () => void }>();
    const frames = new Map<number, () => void>();
    const host: PlaybackClockHost = {
        now: () => now,
        setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { at: now + delay, callback }); return id; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
    };
    return { host, timers, frames, advance(ms: number) {
        now += ms;
        for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
    }, frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); } };
}

test('autoplay keeps elapsed time through interaction holds and resumes its original deadline', () => {
    const h = harness();
    let calls = 0;
    const clock = createPlaybackClock(h.host, () => { calls++; });
    clock.update({ delay: 5000, playing: true, paused: false });
    h.advance(2000);
    clock.update({ delay: 5000, playing: true, paused: true });
    assert.equal(clock.getSnapshot().progress, 0.4);
    assert.equal(clock.getSnapshot().remaining, 3);
    assert.equal(h.timers.size, 0);
    h.advance(9000);
    clock.update({ delay: 5000, playing: true, paused: false });
    h.advance(2999);
    assert.equal(calls, 0);
    h.advance(1);
    assert.equal(calls, 1);
    assert.equal(clock.getSnapshot().progress, 1);
});

test('indicators alone opt into frames; unsubscribe, stop and destruction remove all scheduled work', () => {
    const h = harness();
    const clock = createPlaybackClock(h.host, () => {});
    clock.update({ delay: 5000, playing: true, paused: false });
    assert.equal(h.frames.size, 0);
    let notifications = 0;
    const unsubscribe = clock.subscribe(() => { notifications++; });
    assert.equal(h.frames.size, 1);
    h.advance(1000);
    h.frame();
    assert.equal(notifications, 1);
    assert.equal(clock.getSnapshot().elapsed, 1);
    unsubscribe();
    assert.equal(h.frames.size, 0);
    assert.equal(h.timers.size, 1);
    clock.update({ delay: 5000, playing: false, paused: false });
    assert.equal(clock.getSnapshot().elapsed, 0);
    assert.equal(h.timers.size, 0);
    clock.update({ delay: 5000, playing: true, paused: false });
    clock.subscribe(() => {});
    clock.destroy();
    assert.equal(h.frames.size, 0);
    assert.equal(h.timers.size, 0);
});

test('repeated schedule updates preserve timing, slide reset starts a fresh interval, delay changes clamp', () => {
    const h = harness();
    let calls = 0;
    const clock = createPlaybackClock(h.host, () => { calls++; });
    clock.update({ delay: 5000, playing: true, paused: false });
    h.advance(2000);
    clock.update({ delay: 5000, playing: true, paused: false });
    h.advance(1000);
    assert.equal(clock.getSnapshot().elapsed, 3);
    clock.reset();
    assert.equal(clock.getSnapshot().remaining, 5);
    h.advance(3000);
    clock.update({ delay: 2000, playing: true, paused: false });
    assert.equal(clock.getSnapshot().progress, 1);
    h.advance(0);
    assert.equal(calls, 1);
    clock.update({ delay: Number.NaN, playing: true, paused: false });
    assert.equal(clock.getSnapshot().progress, 0);
    assert.equal(h.timers.size, 0);
});
