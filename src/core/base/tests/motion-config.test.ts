import assert from 'node:assert/strict';
import test from 'node:test';
import { readMotionDefaultMs, readMotionDefaultNumber } from '../motion-config';
import { readMotionTimeMs } from '../timing';

test('semantic JS completion clocks read CSS in the same owner document as the effect', () => {
    const scope = { ownerDocument: { defaultView: { getComputedStyle: () => ({
        getPropertyValue: (key: string) => key === '--t-m-text-slide-duration' ? '220ms'
            : key === '--t-d-fast' ? '0.16s' : key === '--t-m-carousel-drag-threshold' ? '42'
                : key === '--t-m-carousel-inertia-duration' ? '810ms' : '',
    }) } } } as unknown as Element;
    assert.equal(readMotionDefaultMs('textSlide', 'duration', scope), 220);
    assert.equal(readMotionTimeMs(0.6, scope), 600);
    assert.equal(readMotionTimeMs('fast', scope), 160);
    assert.equal(readMotionTimeMs(0, scope), 0);
    assert.equal(readMotionDefaultNumber('carousel', 'dragThreshold', scope), 42);
    assert.equal(readMotionDefaultMs('carousel', 'inertiaDuration', scope), 810);
    assert.equal(readMotionDefaultNumber('carousel', 'inertiaMaxSlides', scope), 3);
});
