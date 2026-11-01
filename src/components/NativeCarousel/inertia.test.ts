import assert from 'node:assert/strict';
import test from 'node:test';
import { projectCarouselDrag } from './inertia';

const options = { enabled: true, duration: 600, maxSlides: 3, minimumVelocity: 150 };
test('momentum follows recent velocity and caps extrapolation beyond release', () => {
    assert.deepEqual(projectCarouselDrag(100, 1, 300, options), { position: 300, duration: 600 });
    assert.deepEqual(projectCarouselDrag(100, -1, 300, options), { position: -100, duration: 600 });
    assert.equal(projectCarouselDrag(100, 100, 300, options).position, 1000);
});
test('slow or disabled momentum does not extrapolate and invalid geometry stays still', () => {
    assert.deepEqual(projectCarouselDrag(100, 0.1, 300, options), { position: 100, duration: 0 });
    assert.deepEqual(projectCarouselDrag(100, 10, 300, { ...options, enabled: false }), { position: 100, duration: 0 });
    assert.deepEqual(projectCarouselDrag(100, 10, 0, options), { position: 100, duration: 0 });
});
