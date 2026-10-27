import assert from 'node:assert/strict';
import test from 'node:test';
import { readMotionDefaultMs } from './motion-config';
import { readMotionTimeMs } from './timing';

test('semantic JS completion clocks read the same CSS duration used by the effect', () => {
    const previous = globalThis.getComputedStyle;
    const scope = {} as Element;
    Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        value: () => ({
            getPropertyValue: (key: string) =>
                key === '--t-m-text-slide-duration' ? '220ms' : key === '--t-d-fast' ? '0.16s' : '',
        }),
    });
    try {
        assert.equal(readMotionDefaultMs('textSlide', 'duration', scope), 220);
        assert.equal(readMotionTimeMs(0.6, scope), 600);
        assert.equal(readMotionTimeMs('fast', scope), 160);
        assert.equal(readMotionTimeMs(0, scope), 0);
    } finally {
        if (previous)
            Object.defineProperty(globalThis, 'getComputedStyle', {
                configurable: true,
                value: previous,
            });
        else Reflect.deleteProperty(globalThis, 'getComputedStyle');
    }
});
