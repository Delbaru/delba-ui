import assert from 'node:assert/strict';
import test from 'node:test';
import { createToastChannel, toast } from '../Toast.channel';
import type { ToastOptions } from '../Toast.types';

test('direct toast has no server queue and reports an absent browser host', () => {
  assert.equal(toast({ title: 'No SSR notification' }), false);
});

test('one command reaches one provider and unmount restores its earlier host', () => {
  const channel = createToastChannel();
  const host = {};
  const outer: ToastOptions[] = [];
  const inner: ToastOptions[] = [];
  const closeOuter = channel.register(host, { show: item => outer.push(item) });
  const closeInner = channel.register(host, { show: item => inner.push(item) });
  assert.equal(channel.send(host, { title: 'Inner' }), true);
  assert.equal(outer.length, 0);
  assert.equal(inner[0]?.title, 'Inner');
  closeInner();
  channel.send(host, { title: 'Outer' });
  assert.equal(outer[0]?.title, 'Outer');
  closeOuter();
  assert.equal(channel.send(host, { title: 'Unmounted' }), false);
});

test('documents are isolated and stale cleanup never unregisters another provider', () => {
  const channel = createToastChannel();
  const a = {};
  const b = {};
  const calls: string[] = [];
  const closeA = channel.register(a, { show: () => calls.push('a') });
  channel.register(b, { show: () => calls.push('b') });
  closeA();
  closeA();
  assert.equal(channel.send(a, { title: 'A' }), false);
  channel.send(b, { title: 'B' });
  assert.deepEqual(calls, ['b']);
});
