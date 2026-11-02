import assert from 'node:assert/strict';
import test from 'node:test';
import { focusContains, restoreNativeDraftAfterBindingChange } from '../Field.model';

function createInput(initialValue: string) {
  let currentValue = initialValue;
  let writes = 0;
  const input = {} as HTMLInputElement;
  Object.defineProperty(input, 'value', {
    get: () => currentValue,
    set: (value: string) => {
      writes += 1;
      currentValue = value;
    },
  });
  return { input, value: () => currentValue, writes: () => writes };
}

test('focus scope uses the current target document realm for relatedTarget', () => {
  class FrameNode {}
  const relatedTarget = new FrameNode();
  const currentTarget = {
    ownerDocument: { defaultView: { Node: FrameNode } },
  } as unknown as HTMLElement;
  const region = {
    current: { contains: (node: Node) => node === relatedTarget },
  } as React.RefObject<HTMLElement | null>;
  const event = { currentTarget, relatedTarget } as unknown as React.FocusEvent<HTMLElement>;

  assert.equal(focusContains(event, [region]), true);
});

test('focus scope rejects nodes from another document realm', () => {
  class FrameNode {}
  const relatedTarget = {};
  const currentTarget = {
    ownerDocument: { defaultView: { Node: FrameNode } },
  } as unknown as HTMLElement;
  const region = {
    current: { contains: () => true },
  } as unknown as React.RefObject<HTMLElement | null>;
  const event = { currentTarget, relatedTarget } as unknown as React.FocusEvent<HTMLElement>;

  assert.equal(focusContains(event, [region]), false);
});

test('native draft is restored after changing back from a model-bound channel', () => {
  const input = createInput('(916) 123 - 45 - 67');
  restoreNativeDraftAfterBindingChange(
    {
      key: 'phone',
      binding: 'model',
      node: input.input,
      controlled: false,
    },
    {
      key: 'native',
      binding: 'native',
      node: input.input,
      controlled: false,
    },
    'edited text',
  );

  assert.equal(input.value(), 'edited text');
  assert.equal(input.writes(), 1);
});

test('native draft restoration skips ordinary renders but handles replacement controls', () => {
  const firstInput = createInput('current');
  const unchanged = {
    key: 'native',
    binding: 'native' as const,
    node: firstInput.input,
    controlled: false,
  };
  restoreNativeDraftAfterBindingChange(unchanged, unchanged, 'draft');
  assert.equal(firstInput.writes(), 0);

  const replacement = createInput('initial');
  restoreNativeDraftAfterBindingChange(
    unchanged,
    {
      ...unchanged,
      node: replacement.input,
    },
    'draft',
  );
  assert.equal(replacement.value(), 'draft');
  assert.equal(replacement.writes(), 1);
});
