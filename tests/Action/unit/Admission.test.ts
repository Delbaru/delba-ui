import assert from 'node:assert/strict';
import test from 'node:test';
import { createActionAdmission } from '../../../src/hooks/ActionAdmission';

test('two surfaces share admission, unrelated scopes do not', () => {
  const admission = createActionAdmission();
  const release = admission.acquire('owner-a/room-a')!;
  assert.equal(admission.pending('owner-a/room-a'), true);
  assert.equal(admission.acquire('owner-a/room-a'), undefined);
  const other = admission.acquire('owner-b/room-a')!;
  release();
  assert.equal(admission.pending('owner-a/room-a'), false);
  assert.equal(admission.pending('owner-b/room-a'), true);
  other();
});

test('old settlement cannot release a newer ticket; subscriptions clean up', () => {
  const admission = createActionAdmission();
  let notifications = 0;
  const unsubscribe = admission.subscribe(() => { notifications++; });
  const first = admission.acquire('same')!;
  first();
  const second = admission.acquire('same')!;
  first();
  assert.equal(admission.pending('same'), true);
  assert.equal(notifications, 3);
  unsubscribe();
  second();
  assert.equal(notifications, 3);
  assert.equal(admission.pending('same'), false);
});
