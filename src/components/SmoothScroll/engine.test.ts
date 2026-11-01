import assert from 'node:assert/strict';
import test from 'node:test';

import { registerScrollProvider, scrollTo, unregisterScrollProvider } from '../../core/base/scroll';
import { createSmoothScroll } from './engine';

test('public scrollTo preserves block alignment through the live SmoothScroll provider', async () => {
    const originals = new Map<string, PropertyDescriptor | undefined>();
    const install = (name: string, value: unknown) => {
        originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { configurable: true, value });
    };
    let clock = 0;
    let nextFrame = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const requestFrame = (callback: FrameRequestCallback) => {
        const id = ++nextFrame;
        frames.set(id, callback);
        queueMicrotask(() => {
            if (!frames.delete(id)) return;
            clock += 16;
            callback(clock);
        });
        return id;
    };
    const cancelFrame = (id: number) => { frames.delete(id); };
    const writes: number[] = [];
    let reduced = true;
    const viewport = {
        scrollY: 0,
        innerHeight: 600,
        matchMedia: () => ({ get matches() { return reduced; }, addEventListener() {}, removeEventListener() {} }),
        addEventListener() {},
        removeEventListener() {},
        requestAnimationFrame: requestFrame,
        cancelAnimationFrame: cancelFrame,
        scrollTo: ({ top }: { top: number }) => { writes.push(top); viewport.scrollY = top; },
    };
    let targetTop = 1000;
    let targetHeight = 100;
    const target = {
        getBoundingClientRect: () => ({ top: targetTop - viewport.scrollY, bottom: targetTop + targetHeight - viewport.scrollY }),
    } as unknown as Element;
    install('window', viewport);
    install('document', { body: {}, documentElement: { scrollHeight: 4000 }, getElementById: () => target });
    install('performance', { now: () => clock, getEntriesByType: () => [] });
    install('PerformanceNavigationTiming', class {});
    install('ResizeObserver', class { observe() {} disconnect() {} });
    install('getComputedStyle', () => ({ scrollMarginTop: '0px', scrollMarginBottom: '0px' }));
    install('requestAnimationFrame', requestFrame);
    install('cancelAnimationFrame', cancelFrame);
    let engine: ReturnType<typeof createSmoothScroll> | undefined;
    try {
        engine = createSmoothScroll({ lerp: 0.08, wheelMultiplier: 1, duration: 0.5, easing: value => value,
            offset: 60, mobile: true, anchors: false, updateHash: false });
        registerScrollProvider(engine);
        for (const [block, expected] of [['start', 940], ['center', 720], ['end', 500], ['nearest', 500]] as const) {
            viewport.scrollY = 0;
            assert.deepEqual(await scrollTo('#target', { block }), { status: 'finished' });
            assert.equal(viewport.scrollY, expected, block);
        }
        viewport.scrollY = 950;
        assert.deepEqual(await scrollTo(target, { block: 'nearest' }), { status: 'finished' });
        assert.equal(viewport.scrollY, 940, 'fixed header offset remains part of the visible viewport');
        viewport.scrollY = 800;
        await scrollTo(target, { block: 'nearest' });
        assert.equal(viewport.scrollY, 800, 'a visible target stays still');
        targetTop = 500;
        targetHeight = 900;
        await scrollTo(target, { block: 'nearest' });
        assert.equal(viewport.scrollY, 800, 'a target covering both viewport edges stays still');
        viewport.scrollY = 2000;
        await scrollTo(target, { block: 'nearest' });
        assert.equal(viewport.scrollY, 800, 'an oversized target above the viewport uses its nearest bottom edge');
        reduced = false;
        targetTop = 1000;
        targetHeight = 100;
        viewport.scrollY = 0;
        const animatedWrites = writes.length;
        await scrollTo(target, { block: 'center', offset: 120 });
        assert.equal(viewport.scrollY, 690, 'animated alignment also respects an explicit per-call offset');
        assert.ok(writes.slice(animatedWrites).some(top => top > 0 && top < 690), 'the same engine animates toward the aligned position');
        assert.ok(writes.length > 0, 'the actual engine writes the document position');
    } finally {
        if (engine) {
            unregisterScrollProvider(engine);
            engine.destroy();
        }
        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    }
});
