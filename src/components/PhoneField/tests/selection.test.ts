import assert from 'node:assert/strict';
import test from 'node:test';
import { mapPhoneSelection } from '../phone-number';

test('phone selection follows digits across inserted separators without collapsing a range', () => {
  assert.deepEqual(
    mapPhoneSelection('+79123456789', '+7 912 345-67-89', {
      selectionStart: 3,
      selectionEnd: 7,
      selectionDirection: 'backward',
    }),
    { start: 4, end: 9, direction: 'backward' },
  );
});

test('phone selection keeps end-of-value and handles unsupported native selection', () => {
  assert.deepEqual(
    mapPhoneSelection('7912', '+7 912', {
      selectionStart: 4,
      selectionEnd: 4,
      selectionDirection: 'none',
    }),
    { start: 6, end: 6, direction: 'none' },
  );
  assert.equal(
    mapPhoneSelection('', '', {
      selectionStart: null,
      selectionEnd: null,
      selectionDirection: null,
    }),
    null,
  );
});
