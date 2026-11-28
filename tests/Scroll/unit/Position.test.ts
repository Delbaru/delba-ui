import assert from 'node:assert/strict';
import test from 'node:test';
import { holdVisibleScrollPosition } from '../../../src/core/Scroll/Position';

function fixture() {
    let sequence = 0;
    let top = -20;
    const frames = new Map<number, FrameRequestCallback>();
    const listeners = new Map<string, () => void>();
    const moves: number[] = [];
    const view = {
        performance: { now: () => 0 },
        getComputedStyle: () => ({ scrollPaddingTop: '10px' }),
        requestAnimationFrame(callback: FrameRequestCallback) {
            frames.set(++sequence, callback);
            return sequence;
        },
        cancelAnimationFrame: (id: number) => frames.delete(id),
        addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
        removeEventListener: (name: string) => listeners.delete(name),
        scrollBy({ top: shift }: ScrollToOptions) {
            moves.push(shift!);
            top -= shift!;
        },
    };
    const root = {
        ownerDocument: { defaultView: view, documentElement: {} },
        getAnimations: () => [],
    } as unknown as HTMLElement;
    const element = { getBoundingClientRect: () => ({ top }) } as unknown as HTMLElement;
    return {
        root, element, frames, listeners, moves,
        tick() {
            const [id, callback] = frames.entries().next().value!;
            frames.delete(id);
            callback(0);
        },
    };
}

test('holding a trigger respects scroll padding and stops after the layout settles', () => {
    const scope = fixture();
    holdVisibleScrollPosition(scope.element, scope.root);
    for (let index = 0; index < 4; index++) scope.tick();
    assert.deepEqual(scope.moves, [-30]);
    assert.equal(scope.frames.size, 0);
    assert.equal(scope.listeners.size, 0);
});

test('user scrolling or owner disposal cancels pending positioning', () => {
    for (const event of ['wheel', 'touchstart', 'dispose']) {
        const scope = fixture();
        const dispose = holdVisibleScrollPosition(scope.element, scope.root);
        if (event === 'dispose') dispose();
        else scope.listeners.get(event)!();
        assert.equal(scope.frames.size, 0);
        assert.equal(scope.listeners.size, 0);
        assert.deepEqual(scope.moves, []);
    }
});
