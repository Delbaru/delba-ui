import assert from 'node:assert/strict';
import test from 'node:test';
import { Transition } from '../../core/base/transition';
import { connectCarousel, createCarouselController, INITIAL_NATIVE_CAROUSEL } from './controller';
import { INITIAL_CAROUSEL_PLAYBACK } from './playback';

test('unmounted commands complete safely and one controller cannot attach twice', async () => {
    const controller = createCarouselController();
    assert.deepEqual(await controller.next(), { status: 'finished' });
    const bridge = connectCarousel(controller, { goTo: () => Transition.done(), autoplay() {} });
    assert.throws(() => connectCarousel(controller, { goTo: () => Transition.done(), autoplay() {} }), /two mounted/);
    bridge.disconnect();
    const next = connectCarousel(controller, { goTo: () => Transition.done(), autoplay() {} });
    next.disconnect();
});

test('commands use current snapshot, playback remains encapsulated, subscriptions detach', () => {
    const controller = createCarouselController();
    const indices: number[] = [];
    const playback: string[] = [];
    let notifications = 0;
    const unsubscribe = controller.subscribe(() => { notifications++; });
    const bridge = connectCarousel(controller, {
        goTo(index) { indices.push(index); return Transition.done(); },
        autoplay(command) { playback.push(command); },
    });
    bridge.publish({ ...INITIAL_NATIVE_CAROUSEL, index: 2, pageCount: 4 });
    controller.next(); controller.prev(); controller.goTo(0);
    controller.play(); controller.pause(); controller.stop();
    assert.deepEqual(indices, [3, 1, 0]);
    assert.deepEqual(playback, ['play', 'pause', 'stop']);
    assert.equal(notifications, 1);
    unsubscribe();
    bridge.disconnect();
    assert.equal(notifications, 1);
    assert.equal(controller.getSnapshot(), INITIAL_NATIVE_CAROUSEL);
});

test('identical playback callbacks retain independent registrations and idempotent cleanup', () => {
    const callbacks = new Set<() => void>();
    const controller = createCarouselController();
    const connection = connectCarousel(controller, {
        goTo: () => Transition.done(), autoplay() {},
        playback: {
            getSnapshot: () => INITIAL_CAROUSEL_PLAYBACK,
            subscribe(callback) { callbacks.add(callback); return () => { callbacks.delete(callback); }; },
        },
    });
    let calls = 0;
    const listener = () => { calls++; };
    const first = controller.subscribePlayback(listener);
    const second = controller.subscribePlayback(listener);
    calls = 0;
    first(); first();
    callbacks.forEach(callback => callback());
    assert.equal(calls, 1);
    assert.equal(callbacks.size, 1);
    second();
    assert.equal(callbacks.size, 0);
    connection.disconnect();
});
