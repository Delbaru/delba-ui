import assert from 'node:assert/strict';
import test from 'node:test';
import { checkFieldValue, type FieldPolicy } from '../policy';

const policy: FieldPolicy = {
  initial: () => '',
  value: {
    draftKey: 'plain',
    binding: 'native',
    supportsSeed: true,
    normalize: (value) => value,
    display: (value) => value,
    isEmpty: (value) => value.length === 0,
    edit: (raw) => ({ value: raw }),
    finish: () => null,
  },
  validation: {
    whileEditing: true,
    check: (value, validate) => value ? 'mode error' : validate?.(value),
  },
  blur: 'control',
};

test('required empty message takes precedence over mode validation', () => {
  assert.equal(checkFieldValue({
    policy,
    value: '',
    required: true,
    readOnly: false,
    emptyMessage: 'Required',
    validate: () => 'custom error',
  }), 'Required');
});

test('optional empty values continue through custom validation', () => {
  assert.equal(checkFieldValue({
    policy,
    value: '',
    required: false,
    readOnly: false,
    emptyMessage: 'Required',
    validate: () => 'custom error',
  }), 'custom error');
});

test('required is suppressed for semantic read-only fields', () => {
  assert.equal(checkFieldValue({
    policy,
    value: '',
    required: true,
    readOnly: true,
    emptyMessage: 'Required',
  }), undefined);
});
