import assert from 'node:assert/strict';
import test from 'node:test';

import { composeEventHandlers } from './composeEventHandlers';

test('notifications receive the same event in order, even when it is cancelled', () => {
  const calls: string[] = [];
  const event = { defaultPrevented: false };
  const handler = composeEventHandlers<typeof event>(
    (current) => {
      assert.equal(current, event);
      current.defaultPrevented = true;
      calls.push('internal');
    },
    (current) => {
      assert.equal(current, event);
      calls.push('consumer');
    },
  );

  handler(event);

  assert.deepEqual(calls, ['internal', 'consumer']);
});

test('an action runs after the consumer and can be cancelled', () => {
  const calls: string[] = [];
  const handler = composeEventHandlers<{ defaultPrevented: boolean; cancel: boolean }>(
    (event) => {
      calls.push('consumer');
      if (event.cancel) event.defaultPrevented = true;
    },
    () => { calls.push('action'); },
    { cancelable: true },
  );

  handler({ defaultPrevented: false, cancel: false });
  handler({ defaultPrevented: false, cancel: true });

  assert.deepEqual(calls, ['consumer', 'action', 'consumer']);
});

test('an already cancelled event skips the action without a consumer', () => {
  let calls = 0;
  const handler = composeEventHandlers(undefined, () => { calls += 1; }, { cancelable: true });

  handler({ defaultPrevented: true });
  handler({ defaultPrevented: false });

  assert.equal(calls, 1);
});

test('cleanup still runs after a consumer cancels the event', () => {
  let cleaned = false;
  const handler = composeEventHandlers<{ defaultPrevented: boolean }>(
    (event) => { event.defaultPrevented = true; },
    () => { cleaned = true; },
  );

  handler({ defaultPrevented: false });

  assert.equal(cleaned, true);
});

test('absent handlers add no wrapper or empty listener', () => {
  const handler = () => undefined;

  assert.equal(composeEventHandlers(undefined, undefined), undefined);
  assert.equal(composeEventHandlers(handler, undefined), handler);
  assert.equal(composeEventHandlers(undefined, handler), handler);
});
