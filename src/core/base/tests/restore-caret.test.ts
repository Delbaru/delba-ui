import assert from 'node:assert/strict';
import test from 'node:test';
import { scheduleCaretRestore } from '../restore-caret';

function createInput() {
  let callback: FrameRequestCallback | undefined;
  let cancelled = -1;
  let selection: [number, number, string] | undefined;
  const view = {
    requestAnimationFrame(next: FrameRequestCallback) {
      callback = next;
      return 7;
    },
    cancelAnimationFrame(id: number) {
      cancelled = id;
    },
  } as unknown as Window;
  const input = {
    ownerDocument: { defaultView: view },
    isConnected: true,
    value: '1234',
    setSelectionRange(start: number, end: number, direction: string) {
      selection = [start, end, direction];
    },
  } as unknown as HTMLInputElement;
  return {
    input,
    runFrame: () => callback?.(0),
    selection: () => selection,
    cancelled: () => cancelled,
  };
}

test('caret restoration uses the owner window frame and can be cancelled', () => {
  const fixture = createInput();
  const cancel = scheduleCaretRestore({
    input: fixture.input,
    displayValue: '1234',
    selectionStart: 2,
    selectionEnd: 3,
    direction: 'forward',
  }, () => true);

  cancel();
  assert.equal(fixture.cancelled(), 7);
});

test('caret restoration skips stale values and applies only to the current value', () => {
  const fixture = createInput();
  scheduleCaretRestore({
    input: fixture.input,
    displayValue: '1234',
    selectionStart: 2,
    selectionEnd: 3,
    direction: 'forward',
  }, () => true);

  fixture.input.value = 'new value';
  fixture.runFrame();
  assert.equal(fixture.selection(), undefined);

  fixture.input.value = '1234';
  scheduleCaretRestore({
    input: fixture.input,
    displayValue: '1234',
    selectionStart: 2,
    selectionEnd: 3,
    direction: 'forward',
  }, () => true);
  fixture.runFrame();
  assert.deepEqual(fixture.selection(), [2, 3, 'forward']);
});
