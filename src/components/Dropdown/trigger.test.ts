import assert from 'node:assert/strict';
import test from 'node:test';

import { composeDropdownTriggerClick } from './trigger';

test('trigger runs the consumer handler before toggling', () => {
  const calls: string[] = [];
  const event = { defaultPrevented: false };
  const click = composeDropdownTriggerClick<typeof event>(
    () => calls.push('consumer'),
    undefined,
    () => calls.push('toggle'),
  );

  click(event);

  assert.deepEqual(calls, ['consumer', 'toggle']);
});

test('trigger does not toggle when consumer prevents the default', () => {
  let toggled = false;
  const event = { defaultPrevented: false };
  const click = composeDropdownTriggerClick<typeof event>(
    (current) => { current.defaultPrevented = true; },
    undefined,
    () => { toggled = true; },
  );

  click(event);

  assert.equal(toggled, false);
});

test('disabled trigger does not toggle', () => {
  let toggled = false;
  const click = composeDropdownTriggerClick(() => undefined, true, () => { toggled = true; });

  click({ defaultPrevented: false });

  assert.equal(toggled, false);
});
