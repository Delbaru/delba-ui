import assert from 'node:assert/strict';
import test from 'node:test';
import { observeAnimationVisibility } from '../animation-visibility';

test('visibility observes the node realm, combines document state and removes all listeners', () => {
    let intersect: IntersectionObserverCallback | undefined;
    let disconnected = false;
    const handlers = new Map<string, () => void>();
    const doc = {
        hidden: false,
        defaultView: {
            IntersectionObserver: class {
                constructor(callback: IntersectionObserverCallback) { intersect = callback; }
                observe() {}
                disconnect() { disconnected = true; }
            },
        },
        addEventListener(name: string, callback: () => void) { handlers.set(name, callback); },
        removeEventListener(name: string) { handlers.delete(name); },
    };
    const node = { ownerDocument: doc } as unknown as Element;
    const values: boolean[] = [];
    const stop = observeAnimationVisibility(node, value => values.push(value), '0px');
    assert.deepEqual(values, [false]);
    intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    assert.equal(values.at(-1), true);
    doc.hidden = true;
    handlers.get('visibilitychange')?.();
    assert.equal(values.at(-1), false);
    doc.hidden = false;
    handlers.get('visibilitychange')?.();
    assert.equal(values.at(-1), true);
    stop();
    assert.equal(disconnected, true);
    assert.equal(handlers.size, 0);
});
