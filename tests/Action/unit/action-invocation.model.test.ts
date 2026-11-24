import assert from 'node:assert/strict';
import test from 'node:test';
import { isAbortActionError } from '../../../src/hooks/action-invocation.model';

test('AbortError is cancellation, including a plain RTK-shaped error', () => {
  assert.equal(isAbortActionError({ name: 'AbortError', message: 'aborted' }), true);
});

test('domain and unexpected errors remain failures', () => {
  assert.equal(isAbortActionError(new Error('permission denied')), false);
  assert.equal(isAbortActionError({ name: 'ValidationError' }), false);
  assert.equal(isAbortActionError(null), false);
});
