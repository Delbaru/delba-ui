import assert from 'node:assert/strict';
import test from 'node:test';

import { MediaOperationOwner } from '../operation-owner';

test('a newer media action aborts and invalidates the older operation', () => {
  const owner = new MediaOperationOwner();
  const fileRead = owner.begin();
  const linkSubmit = owner.begin();

  assert.equal(fileRead.signal.aborted, true);
  assert.equal(fileRead.isCurrent(), false);
  assert.equal(linkSubmit.signal.aborted, false);
  assert.equal(linkSubmit.isCurrent(), true);
});

test('clear, disable, and unmount cancellation invalidate the pending operation', () => {
  const owner = new MediaOperationOwner();
  const pending = owner.begin();

  owner.cancel();

  assert.equal(pending.signal.aborted, true);
  assert.equal(pending.isCurrent(), false);
});
