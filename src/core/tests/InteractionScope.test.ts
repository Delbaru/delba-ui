import assert from 'node:assert/strict';
import test from 'node:test';
import { observeInteractionTarget } from '../InteractionScope';

test('interaction observation belongs to the target realm and releases every subscription', () => {
  class RealmNode {}
  const handlers = new Map<string, (event: unknown) => void>();
  let disconnected = false;
  let resized: ((entries: unknown[]) => void) | undefined;
  const inner = new RealmNode();
  const doc = {
    activeElement: inner,
    defaultView: {
      Node: RealmNode,
      getComputedStyle: () => ({ position: 'fixed', top: '0px' }),
      ResizeObserver: class {
        constructor(change: (entries: unknown[]) => void) { resized = change; }
        observe() {}
        disconnect() { disconnected = true; }
      },
    },
    addEventListener(name: string, handler: (event: unknown) => void) { handlers.set(name, handler); },
    removeEventListener(name: string) { handlers.delete(name); },
  };
  const node = Object.assign(new RealmNode(), {
    ownerDocument: doc,
    contains: (target: unknown) => target === inner,
    getBoundingClientRect: () => ({ height: 40 }),
  }) as unknown as HTMLElement;
  const pointed: boolean[] = [];
  const focused: boolean[] = [];
  const dispose = observeInteractionTarget(node, undefined, value => pointed.push(value), value => focused.push(value));
  assert.deepEqual(focused, [true]);
  handlers.get('pointermove')?.({ pointerType: 'mouse', target: new RealmNode(), clientY: 30 });
  resized?.([{ borderBoxSize: [{ blockSize: 10 }], contentRect: { height: 10 } }]);
  handlers.get('pointermove')?.({ pointerType: 'mouse', target: new RealmNode(), clientY: 30 });
  assert.deepEqual(pointed, [true, false]);
  handlers.get('focusout')?.({ type: 'focusout', relatedTarget: new RealmNode() });
  assert.deepEqual(focused, [true, false]);
  dispose();
  assert.equal(disconnected, true);
  assert.equal(handlers.size, 0);
});
