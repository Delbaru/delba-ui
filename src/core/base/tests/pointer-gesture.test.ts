import test from 'node:test';
import assert from 'node:assert/strict';
import { beginPointerGesture, type PointerGestureResult } from '../pointer-gesture';

class FakeElement extends EventTarget {
  nodeType = 1;
  ownerDocument!: Document;
  style = { userSelect: '' };
  captured = new Set<number>();
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  contains(target: EventTarget | null) { return target === this; }
}

function fixture() {
  const document = new EventTarget() as Document & EventTarget;
  const origin = new FakeElement();
  const other = new FakeElement();
  const body = new FakeElement();
  const view = new EventTarget();
  Object.assign(document, { body, defaultView: view, visibilityState: 'visible' });
  for (const node of [origin, other, body]) node.ownerDocument = document;
  const emit = (name: string, fields: Record<string, unknown> = {}, destination: EventTarget = document, target: EventTarget = destination) => {
    const event = new Event(name, { cancelable: true });
    Object.assign(event, fields);
    Object.defineProperty(event, 'target', { configurable: true, value: target });
    destination.dispatchEvent(event);
    return event;
  };
  const start = (pointerId = 7) => ({ currentTarget: origin as unknown as HTMLElement, button: 0, pointerId, clientX: 10, clientY: 10 });
  const move = (pointerId = 7, x = 30) => emit('pointermove', { pointerId, clientX: x, clientY: 10 });
  const up = (pointerId = 7, x = 30) => emit('pointerup', { pointerId, clientX: x, clientY: 10 });
  const click = (pointerId: number, target: EventTarget = origin, detail = 1) =>
    emit('click', { pointerId, detail }, document, target);
  return { document, origin, other, body, view, emit, start, move, up, click };
}

test('zero/subthreshold movement does not capture or intercept nested title clicks', () => {
  const f = fixture();
  const finish: PointerGestureResult[] = [];
  beginPointerGesture(f.start(), { threshold: 4, suppressClick: true, onFinish: value => finish.push(value) });
  assert.equal(f.origin.captured.size, 0, 'pointerdown must not steal native focus/click');
  f.move(7, 13);
  assert.equal(f.origin.captured.size, 0);
  f.up(7, 13);
  assert.equal(f.click(7).defaultPrevented, false);
  assert.deepEqual(finish.map(value => [value.reason, value.started]), [['up', false]]);
});

test('successful drag blocks only matching pointer-generated click, never keyboard/different target/pointer', () => {
  const f = fixture();
  const result: PointerGestureResult[] = [];
  const session = beginPointerGesture(f.start(), {
    threshold: 4, preventSelection: true, suppressClick: true,
    onFinish: value => result.push(value),
  })!;
  f.body.style.userSelect = 'text';
  f.move();
  assert.equal(f.origin.captured.has(7), true);
  assert.equal(f.body.style.userSelect, 'none');
  f.up();
  session.cancel(); // Cleanup after completion must not disarm its pending click.
  assert.equal(f.body.style.userSelect, 'text');
  assert.equal(f.origin.captured.size, 0);
  assert.equal(f.click(7, f.origin, 0).defaultPrevented, false, 'keyboard activation has detail 0');
  assert.equal(f.click(99).defaultPrevented, false, 'different pointer still activates');
  assert.equal(f.click(7, f.other).defaultPrevented, false, 'other target still activates');
  assert.equal(f.click(7).defaultPrevented, true, 'drag-generated click on origin is consumed');
  assert.equal(f.click(7).defaultPrevented, false, 'one-shot suppression');
  assert.deepEqual(result.map(value => value.reason), ['up']);
});

test('pointercancel is rollback and never blocks a subsequent independent click', () => {
  const f = fixture();
  const results: PointerGestureResult[] = [];
  beginPointerGesture(f.start(), { threshold: 4, suppressClick: true, onFinish: value => results.push(value) });
  f.move();
  f.emit('pointercancel', { pointerId: 7 });
  assert.equal(f.click(7).defaultPrevented, false);
  assert.deepEqual(results.map(value => value.reason), ['pointercancel']);
});

test('Escape and lostcapture ignore other inputs, but suppress the canceled pointer click after its up', () => {
  const f = fixture();
  const results: PointerGestureResult[] = [];
  beginPointerGesture(f.start(), { threshold: 4, suppressClick: true, onFinish: value => results.push(value) });
  f.move();
  f.emit('keydown', { key: 'Escape', isComposing: false });
  assert.equal(f.click(7, f.origin, 0).defaultPrevented, false);
  assert.equal(f.click(21).defaultPrevented, false);
  f.up();
  assert.equal(f.click(7).defaultPrevented, true);
  assert.deepEqual(results.map(value => value.reason), ['escape']);

  beginPointerGesture(f.start(8), { threshold: 4, suppressClick: true, onFinish: value => results.push(value) });
  f.move(8);
  f.emit('lostpointercapture', { pointerId: 8 }, f.origin);
  f.up(8);
  assert.equal(f.click(8).defaultPrevented, true);
  assert.deepEqual(results.map(value => value.reason), ['escape', 'lostcapture']);
});

test('blur/dispose/repeated gesture release listeners without swallowing a new pointer activation', () => {
  const f = fixture();
  const results: string[] = [];
  beginPointerGesture(f.start(), { threshold: 4, suppressClick: true, onFinish: value => results.push(value.reason) });
  f.move();
  f.emit('blur', {}, f.view);
  assert.equal(f.click(7).defaultPrevented, false);
  // Beginning a distinct gesture cancels an abandoned click guard for the previous origin.
  const second = beginPointerGesture(f.start(9), { threshold: 4, suppressClick: true, onFinish: value => results.push(value.reason) })!;
  second.cancel();
  second.cancel();
  assert.equal(f.click(9).defaultPrevented, false);
  assert.deepEqual(results, ['blur', 'dispose']);
});

test('disposing from activation does not deliver a move after finish', () => {
  const f = fixture();
  const calls: string[] = [];
  const session = beginPointerGesture(f.start(), {
    threshold: 4,
    onStart: () => session!.cancel(),
    onMove: () => calls.push('move'),
    onFinish: result => calls.push(result.reason),
  });
  f.move();
  f.up();
  assert.deepEqual(calls, ['dispose']);
  assert.equal(f.origin.captured.size, 0);
});

test('bubbling loss of a child capture does not finish the origin gesture', () => {
  const f = fixture();
  const results: string[] = [];
  beginPointerGesture(f.start(), {
    threshold: 4,
    onFinish: result => results.push(result.reason),
  });
  f.move();
  f.emit('lostpointercapture', { pointerId: 7 }, f.origin, f.other);
  assert.equal(results.length, 0);
  f.up();
  assert.deepEqual(results, ['up']);
});
