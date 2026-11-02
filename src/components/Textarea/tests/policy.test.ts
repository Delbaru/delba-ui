import assert from 'node:assert/strict';
import test from 'node:test';
import { checkFieldValue } from '../../../core/fields/policy';
import { textareaConfig } from '../Textarea.config';

test('multiline length validation preserves optional empty text and validates before custom rules', () => {
  const policy = textareaConfig.policy({ length: { min: 3, max: 5 } });
  let checked = false;
  const custom = () => {
    checked = true;
    return 'custom';
  };
  assert.equal(
    policy.validation.check('', () => undefined),
    undefined,
  );
  assert.equal(policy.validation.check('ab', custom), 'Минимум 3 символов');
  assert.equal(checked, false);
  assert.equal(policy.validation.check('abcdef', custom), 'Максимум 5 символов');
  assert.equal(policy.validation.check('abcd', custom), 'custom');
  assert.equal(checked, true);
});

test('readonly multiline skips required but still checks length and custom validation', () => {
  const policy = textareaConfig.policy({ length: { max: 3 } });
  const check = (value: string, validate?: (value: string) => string | undefined) =>
    checkFieldValue({
      value,
      validate,
      policy,
      required: true,
      readOnly: true,
      emptyMessage: 'required',
    });
  assert.equal(check(''), undefined);
  assert.equal(check('long'), 'Максимум 3 символов');
  assert.equal(
    check('ok', () => 'custom'),
    'custom',
  );
});
