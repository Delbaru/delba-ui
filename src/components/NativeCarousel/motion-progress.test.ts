import assert from 'node:assert/strict';
import test from 'node:test';
import { Transition } from '../../core/base/transition';
import { connectCarousel, createCarouselController } from './controller';
import { createCarouselMotionProgress } from './motion-progress';

test('directional commands dispatch step while absolute navigation keeps goTo and legacy fallback', () => {
    const controller = createCarouselController();
    const steps: number[] = [];
    const absolute: number[] = [];
    const driver = { goTo(index: number) { absolute.push(index); return Transition.done(); }, autoplay() {} };
    const connection = connectCarousel(controller, { ...driver, step(direction) { steps.push(direction); return Transition.done(); } });
    controller.next(); controller.prev(); controller.goTo(3);
    assert.deepEqual(steps, [1, -1]);
    assert.deepEqual(absolute, [3]);
    connection.disconnect();
    const fallback = connectCarousel(controller, driver);
    controller.next(); controller.prev();
    assert.deepEqual(absolute, [3, 1, -1]);
    fallback.disconnect();
});

function source() {
    let position = 0;
    const observations: boolean[] = [];
    const seeks: number[] = [];
    const progress = createCarouselMotionProgress({ read: () => position, seek(value) { position = value; seeks.push(value); },
        onSubscriptionChange: observed => observations.push(observed) });
    return { progress, observations, seeks, write(value: number) { position = value; progress.publish(); } };
}

test('motion getter reads live position without listeners and seeks fractional positions safely', () => {
    const controller = createCarouselController();
    assert.equal(controller.progress, 0);
    const s = source();
    const connection = connectCarousel(controller, { goTo: () => Transition.done(), autoplay() {}, motionProgress: s.progress });
    controller.seek(0.325);
    assert.equal(controller.progress, 0.325);
    assert.deepEqual(s.seeks, [0.325]);
    assert.deepEqual(s.observations, []);
    controller.seek(Number.NaN);
    controller.seek(Infinity);
    assert.deepEqual(s.seeks, [0.325]);
    controller.seek(2);
    controller.seek(-2);
    assert.deepEqual(s.seeks, [0.325, 1, 0]);
    s.write(Number.NaN);
    assert.equal(controller.progress, 0);
    connection.disconnect();
});

test('progress registrations share one driver subscription, survive remount and clean up independently', () => {
    const controller = createCarouselController();
    const received: number[] = [];
    const listener = (value: number) => received.push(value);
    const stopFirst = controller.subscribeProgress(listener);
    const stopSecond = controller.subscribeProgress(listener);
    const first = source();
    const connection = connectCarousel(controller, { goTo: () => Transition.done(), autoplay() {}, motionProgress: first.progress });
    assert.equal(first.progress.subscriberCount, 1);
    received.length = 0;
    first.write(0.4);
    first.write(0.4);
    assert.deepEqual(received, [0.4, 0.4]);
    stopFirst(); stopFirst();
    first.write(0.5);
    assert.equal(received.at(-1), 0.5);
    assert.equal(first.progress.subscriberCount, 1);
    connection.disconnect();
    assert.equal(first.progress.subscriberCount, 0);
    assert.equal(received.at(-1), 0);
    const before = received.length;
    first.write(0.9);
    assert.equal(received.length, before);
    const second = source();
    second.write(0.25);
    const remount = connectCarousel(controller, { goTo: () => Transition.done(), autoplay() {}, motionProgress: second.progress });
    assert.equal(controller.progress, 0.25);
    assert.equal(received.at(-1), 0.25);
    stopSecond();
    assert.deepEqual(second.observations, [true, false]);
    second.write(0.8);
    assert.equal(controller.progress, 0.8);
    remount.disconnect();
});

test('source sampling ownership starts once, stops once, and callbacks remain independently removable', () => {
    const s = source();
    let calls = 0;
    const listener = () => { calls++; };
    const a = s.progress.subscribe(listener);
    const b = s.progress.subscribe(listener);
    assert.deepEqual(s.observations, [true]);
    s.write(0.2);
    assert.equal(calls, 2);
    a(); a();
    s.write(0.3);
    assert.equal(calls, 3);
    b();
    assert.deepEqual(s.observations, [true, false]);
    s.write(0.4);
    assert.equal(calls, 3);
});
