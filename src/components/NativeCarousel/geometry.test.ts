import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedCarouselPage, carouselGeometry, nearestCarouselPage, loopSlideShift, loopDestination } from './geometry';

test('multiple visible slides stop at the content edge and expose only reachable pages', () => {
    assert.deepEqual(carouselGeometry(5, 1000, 20, 3).offsets, [0, 340, 680]);
    assert.deepEqual(carouselGeometry(2, 1000, 20, 3).offsets, [0]);
});
test('fractional slides clamp the final page without empty space', () => {
    const result = carouselGeometry(3, 600, 24, 1.5);
    assert.deepEqual(result.offsets, [0, 416, 624]);
    assert.equal(nearestCarouselPage(result.offsets, 590), 2);
});
test('empty and initially unmeasurable carousels have a stable origin', () => {
    assert.deepEqual(carouselGeometry(0, 800, 20, 1).offsets, [0]);
    assert.deepEqual(carouselGeometry(3, 0, 20, 1).offsets, [0]);
});
test('rewind is explicit and negative or invalid commands remain bounded', () => {
    assert.equal(boundedCarouselPage(-1, 4, false), 0);
    assert.equal(boundedCarouselPage(-1, 4, true), 3);
    assert.equal(boundedCarouselPage(4, 4, true), 0);
    assert.equal(boundedCarouselPage(Infinity, 4, true), 0);
    assert.equal(boundedCarouselPage(2, 0, true), 0);
});

test('loop places each original exactly once across positive and negative seams', () => {
    const count = 6;
    const span = 216;
    const gap = 16;
    for (const visible of [1, 2.5, 4]) {
        const size = visible * span - gap;
        for (const step of [-6.8, -0.2, 0, 0.2, 0.8, 5, 5.8, 6, 6.3]) {
            const position = step * span;
            for (let slot = Math.floor(step) - 1; slot <= Math.ceil((position + size) / span); slot++) {
                const left = slot * span;
                if (left + span - gap <= position + 0.01 || left >= position + size) continue;
                const original = boundedCarouselPage(slot, count, true);
                const placed = original * span + loopSlideShift(original, position, span, gap, count);
                assert.ok(Math.abs(placed - left) < 0.01, `slide ${original}, position ${position}, visible ${visible}`);
            }
        }
    }
});

test('loop next/previous cross the seam by one step while goTo takes the nearest cycle', () => {
    assert.equal(loopDestination(6, 5, 500, 100, 6), 600);
    assert.equal(loopDestination(-1, 0, 0, 100, 6), -100);
    assert.equal(loopDestination(5, 0, 0, 100, 6), -100);
    assert.equal(loopDestination(0, 5, 500, 100, 6), 600);
    assert.equal(loopDestination(2, 2, 180, 100, 6), 200);
    assert.equal(loopDestination(2, 3, 150, 100, 6), 200);
    assert.equal(loopDestination(1, 0, 0, 100, 2), 100);
    assert.equal(loopDestination(-1, 0, 0, 100, 2), -100);
});
