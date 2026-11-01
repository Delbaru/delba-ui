import assert from 'node:assert/strict';
import test from 'node:test';
import { Transition } from '../../core/base/transition';
import { connectCarousel, createCarouselController, INITIAL_NATIVE_CAROUSEL } from './controller';
import { createPlaybackClock } from './playback';
import { synchronizeCarousels } from './sync';

function mounted(pages: number) {
    const controller = createCarouselController();
    let index = 0;
    let pageCount = pages;
    let commands = 0;
    const publish = () => connection.publish({ ...INITIAL_NATIVE_CAROUSEL, index, pageCount, slideCount: 6 });
    const connection = connectCarousel(controller, { goTo(next) {
        commands++;
        index = Math.min(Math.max(0, next), pageCount - 1);
        publish();
        return Transition.done();
    }, autoplay() {} });
    publish();
    return { controller, connection, commands: () => commands, resize(pages: number) { pageCount = pages; publish(); } };
}

test('bidirectional sync maps slide indices, never reflects a multi-slide partner clamp back', () => {
    const main = mounted(6);
    const thumbs = mounted(4);
    const cleanup = synchronizeCarousels([main.controller, thumbs.controller, thumbs.controller]);
    main.controller.goTo(5);
    assert.equal(main.controller.getSnapshot().index, 5);
    assert.equal(thumbs.controller.getSnapshot().index, 3);
    assert.equal(thumbs.commands(), 1);
    thumbs.controller.goTo(2);
    assert.equal(main.controller.getSnapshot().index, 2);
    thumbs.resize(3);
    assert.equal(main.controller.getSnapshot().index, 2);
    cleanup();
    cleanup();
    thumbs.controller.goTo(1);
    assert.equal(main.controller.getSnapshot().index, 2);
});

test('one-way groups connect late partners and do not let their commands drive the leader', () => {
    const main = mounted(6);
    const partner = mounted(0);
    const cleanup = synchronizeCarousels([main.controller, partner.controller], { bidirectional: false });
    main.controller.goTo(4);
    partner.resize(5);
    assert.equal(partner.controller.getSnapshot().index, 4);
    partner.controller.goTo(1);
    assert.equal(main.controller.getSnapshot().index, 4);
    partner.connection.disconnect();
    assert.equal(main.controller.getSnapshot().index, 4);
    cleanup();
});

test('playback subscriptions survive mounting and detach from the previous driver on unmount', () => {
    const controller = createCarouselController();
    const callbacks = new Map<number, () => void>();
    let id = 0;
    const clock = createPlaybackClock({ now: () => 0,
        setTimeout() { return ++id; }, clearTimeout() {},
        requestAnimationFrame(callback) { callbacks.set(++id, callback); return id; },
        cancelAnimationFrame(id) { callbacks.delete(id); },
    }, () => {});
    let notifications = 0;
    const unsubscribe = controller.subscribePlayback(() => { notifications++; });
    const connection = connectCarousel(controller, { goTo: () => Transition.done(), autoplay() {}, playback: clock });
    clock.update({ delay: 5000, playing: true, paused: false });
    assert.equal(controller.getPlaybackSnapshot().duration, 5);
    assert.equal(callbacks.size, 1);
    connection.disconnect();
    assert.equal(controller.getPlaybackSnapshot().duration, 0);
    assert.equal(callbacks.size, 0);
    const before = notifications;
    clock.reset();
    assert.equal(notifications, before);
    unsubscribe();
    clock.destroy();
});
